# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "fiona",
#     "shapely",
# ]
# ///

import json
from pathlib import Path
import fiona
from shapely.geometry import shape, mapping
from shapely import difference

DATA_DIR = 'data/ne/'

def get_shape_from_shapefile(shapefile_path, name_filter):
    """Read shapefile and extract geometry for specific feature by name."""
    print(f'Getting shape for {name_filter} from {shapefile_path}...')
    with fiona.open(shapefile_path) as src:
        for feature in src:
            # Check NAME field or other relevant fields
            props = feature['properties']
            name = props.get('NAME', '')
            if name and name_filter == name:
                return shape(feature['geometry'])
    raise Exception(f'Could not find feature matching "{name_filter}" in {shapefile_path}')

def write_geojson(shapes, path):
    feats = []
    for shp in shapes:
        feat = { 'type': 'Feature', 'properties': {} }
        feat['geometry'] = mapping(shp)
        feats.append(feat)
    out = { 'type': 'FeatureCollection', 'features': feats }
    path.write_text(json.dumps(out))


if __name__ == '__main__':
    base_shapefile = Path(f'{DATA_DIR}base/ne_10m_admin_0_countries.shp')
    ind_shapefile = Path(f'{DATA_DIR}ind/ne_10m_admin_0_countries_ind.shp')
    chn_shapefile = Path(f'{DATA_DIR}chn/ne_10m_admin_0_countries_chn.shp')
    pak_shapefile = Path(f'{DATA_DIR}pak/ne_10m_admin_0_countries_pak.shp')
    
    # Get shapes from base (standard Natural Earth)
    print("Reading from base shapefile...")
    india_base = get_shape_from_shapefile(base_shapefile, 'India')
    pakistan_base = get_shape_from_shapefile(base_shapefile, 'Pakistan')
    china_base = get_shape_from_shapefile(base_shapefile, 'China')
    siachen_base = get_shape_from_shapefile(base_shapefile, 'Siachen Glacier')
    
    # Get India shape from ind (India-perspective Natural Earth)
    print("Reading from ind shapefile...")
    india_official_shape = get_shape_from_shapefile(ind_shapefile, 'India')
    
    # Get China and Pakistan shapes from their perspective shapefiles
    print("Reading from chn shapefile...")
    china_chn = get_shape_from_shapefile(chn_shapefile, 'China')
    print("Reading from pak shapefile...")
    pakistan_pak = get_shape_from_shapefile(pak_shapefile, 'Pakistan')
    
    india_base_bound = india_base.boundary
    pakistan_base_bound = pakistan_base.boundary
    siachen_base_bound = siachen_base.boundary
    
    # India's official shape includes Siachen and other disputed territories
    india_official_shape_bound = india_official_shape.boundary
    
    # Calculate boundaries to add (in ind but not in base India/Pakistan)
    official_diff_shape_bound = difference(india_official_shape_bound, india_base_bound)
    official_diff_shape_bound = difference(official_diff_shape_bound, pakistan_base_bound)
    official_diff_shape_bound = difference(official_diff_shape_bound, siachen_base_bound)
    write_geojson([official_diff_shape_bound], Path(f'{DATA_DIR}to_add.geojson'))
    
    # Calculate boundaries to delete (in base India/Pakistan that intersect with official India)
    india_intersect_official = india_base_bound.intersection(india_official_shape)
    pakistan_intersect_official = pakistan_base_bound.intersection(india_official_shape)
    siachen_intersect_official = siachen_base_bound.intersection(india_official_shape)
    
    to_del = []
    to_del.append(difference(india_intersect_official, india_official_shape_bound))
    to_del.append(difference(pakistan_intersect_official, india_official_shape_bound))
    to_del.append(difference(siachen_intersect_official, india_official_shape_bound))
    write_geojson(to_del, Path(f'{DATA_DIR}to_del.geojson'))
    
    # Generate disputed area boundaries on India's official boundary
    # These are parts of India's official boundary that fall completely within China or Pakistan's claimed territory
    china_chn_shape = china_chn
    pakistan_pak_shape = pakistan_pak
    
    to_add_disp = []
    
    # India's official boundary parts that are completely inside China's claimed territory
    # (not on China's boundary, but fully within the polygon)
    ind_bound_in_china = india_official_shape_bound.intersection(china_chn_shape)
    # Remove parts that touch China's boundary (keep only parts fully inside)
    ind_bound_in_china = difference(ind_bound_in_china, china_chn_shape.boundary)
    # Remove parts already in to_add layer
    ind_bound_in_china = difference(ind_bound_in_china, official_diff_shape_bound)
    if not ind_bound_in_china.is_empty:
        to_add_disp.append(ind_bound_in_china)
    
    # India's official boundary parts that are completely inside Pakistan's claimed territory
    ind_bound_in_pakistan = india_official_shape_bound.intersection(pakistan_pak_shape)
    # Remove parts that touch Pakistan's boundary (keep only parts fully inside)
    ind_bound_in_pakistan = difference(ind_bound_in_pakistan, pakistan_pak_shape.boundary)
    # Remove parts already in to_add layer
    ind_bound_in_pakistan = difference(ind_bound_in_pakistan, official_diff_shape_bound)
    if not ind_bound_in_pakistan.is_empty:
        to_add_disp.append(ind_bound_in_pakistan)
    
    write_geojson(to_add_disp, Path(f'{DATA_DIR}to_add_disp.geojson'))
    
    print(f"Created {DATA_DIR}to_add.geojson, {DATA_DIR}to_del.geojson, and {DATA_DIR}to_add_disp.geojson")
