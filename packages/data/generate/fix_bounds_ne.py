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
from shapely import difference, intersection, union_all
from shapely.ops import linemerge

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


def get_states_by_country(shapefile_path, admin_filter):
    """Read states shapefile and extract geometries for states belonging to a country."""
    print(f'Getting states for {admin_filter} from {shapefile_path}...')
    states = {}
    with fiona.open(shapefile_path) as src:
        for feature in src:
            props = feature['properties']
            admin = props.get('admin', '')
            if admin == admin_filter:
                name = props.get('name', props.get('NAME', ''))
                if name:
                    states[name] = shape(feature['geometry'])
    return states


def get_state_by_name(shapefile_path, state_name):
    """Read states shapefile and extract geometry for a specific state by name."""
    print(f'Getting state {state_name} from {shapefile_path}...')
    with fiona.open(shapefile_path) as src:
        for feature in src:
            props = feature['properties']
            name = props.get('name', props.get('NAME', ''))
            if name == state_name:
                return shape(feature['geometry'])
    raise Exception(f'Could not find state "{state_name}" in {shapefile_path}')

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
    states_shapefile = Path(f'{DATA_DIR}states/ne_10m_admin_1_states_provinces.shp')
    
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
    to_del_combined = union_all(to_del)
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
    
    # --- Internal state boundaries ---
    # Get Jammu and Kashmir (India) and PoK (Pakistan-occupied Kashmir) from the states shapefile
    # and combine them to form India's official Jammu & Kashmir state boundary
    print("Reading J&K states from states shapefile...")
    jk_india = get_state_by_name(states_shapefile, 'Jammu and Kashmir')
    pok = get_state_by_name(states_shapefile, 'Azad Kashmir')
    
    # Combine to form India's official J&K
    jk_official = union_all([jk_india, pok])
    indian_states = {'Jammu and Kashmir': jk_official}
    print("Combined Jammu and Kashmir + PoK for India's official J&K boundary")
    
    # Get Chinese states from the states shapefile  
    print("Reading Chinese states from states shapefile...")
    chinese_states = get_states_by_country(states_shapefile, 'China')
    print(f"Found {len(chinese_states)} Chinese states")
    
    # Create to-del-ne-internal: Chinese state boundaries within India's claimed boundary
    # Remove parts that are on India's official boundary or on the main deletions
    to_del_internal = []
    for state_name, state_shape in chinese_states.items():
        state_bound = state_shape.boundary
        # Get parts of Chinese state boundary that are inside India's official shape
        inside_india = intersection(state_bound, india_official_shape)
        # Remove parts that are on India's official boundary
        inside_india = difference(inside_india, india_official_shape_bound)
        # Remove parts that are on the main deletions (to_del)
        inside_india = difference(inside_india, to_del_combined)
        if not inside_india.is_empty:
            to_del_internal.append(inside_india)
    to_del_internal_combined = union_all(to_del_internal) if to_del_internal else None
    write_geojson(to_del_internal, Path(f'{DATA_DIR}to_del_internal.geojson'))
    
    # Create to-add-ne-internal: Indian state boundaries that run along the main deletions (to_del)
    # Buffer the deletions slightly and find state boundaries that fall within that buffer
    BUFFER_DISTANCE = 1e-5  # ~1 meter buffer in degrees
    to_del_buffered = to_del_combined.buffer(BUFFER_DISTANCE)
    
    to_add_internal = []
    for state_name, state_shape in indian_states.items():
        state_bound = state_shape.boundary
        # Get parts of Indian state boundary that are inside India's official shape
        inside_india = intersection(state_bound, india_official_shape)
        # Only keep parts that run along the main deletions (within buffer)
        along_deletions = intersection(inside_india, to_del_buffered)
        if not along_deletions.is_empty:
            to_add_internal.append(along_deletions)
    
    # Filter out points and tiny line segments from to_add_internal
    # First merge lines to connect adjacent segments, then filter small isolated pieces
    MIN_LENGTH = 1e-6  # Minimum length threshold (in degrees)
    
    def extract_lines(geom):
        """Extract all LineString geometries from any geometry type."""
        if geom.is_empty:
            return []
        if geom.geom_type == 'LineString':
            return [geom]
        elif geom.geom_type == 'LinearRing':
            return [geom]
        elif geom.geom_type in ('MultiLineString', 'GeometryCollection'):
            lines = []
            for g in geom.geoms:
                lines.extend(extract_lines(g))
            return lines
        else:
            return []
    
    # Flatten to list of LineStrings
    all_lines = []
    for geom in to_add_internal:
        all_lines.extend(extract_lines(geom))
    
    # Merge line segments to connect adjacent pieces
    if all_lines:
        merged = linemerge(all_lines)
        # linemerge returns a single geometry (LineString or MultiLineString)
        if merged.geom_type == 'LineString':
            to_add_internal = [merged]
        elif merged.geom_type == 'MultiLineString':
            to_add_internal = list(merged.geoms)
        elif merged.geom_type == 'GeometryCollection':
            to_add_internal = list(merged.geoms)
        else:
            to_add_internal = [merged]
    else:
        to_add_internal = []
    
    # Now filter out points and tiny isolated segments
    filtered_add_internal = []
    for geom in to_add_internal:
        if geom.geom_type == 'Point':
            continue  # Skip points
        elif geom.geom_type == 'MultiPoint':
            continue  # Skip multipoints
        elif geom.geom_type in ('LineString', 'LinearRing'):
            if geom.length > MIN_LENGTH:
                filtered_add_internal.append(geom)
        elif geom.geom_type in ('MultiLineString', 'GeometryCollection'):
            # Filter individual geometries within collection
            from shapely.geometry import GeometryCollection
            parts = [g for g in geom.geoms 
                     if g.geom_type not in ('Point', 'MultiPoint') and g.length > MIN_LENGTH]
            if parts:
                filtered_add_internal.append(GeometryCollection(parts) if len(parts) > 1 else parts[0])
        else:
            filtered_add_internal.append(geom)
    
    write_geojson(filtered_add_internal, Path(f'{DATA_DIR}to_add_internal.geojson'))
    
    print(f"Created {DATA_DIR}to_add.geojson, {DATA_DIR}to_del.geojson, {DATA_DIR}to_add_disp.geojson")
    print(f"Created {DATA_DIR}to_add_internal.geojson, {DATA_DIR}to_del_internal.geojson")
