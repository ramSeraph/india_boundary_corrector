# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "osm2geojson",
#     "shapely",
# ]
# ///

import json
from pathlib import Path
from osm2geojson import overpass_call, xml2geojson
from shapely.geometry import shape, mapping
from shapely import difference, union_all, intersection
from shapely.ops import linemerge

DATA_DIR = 'data/osm/'

def save_as_geojson(query, path):
    xml = overpass_call(query)
    geojson = xml2geojson(xml)
    path.write_text(json.dumps(geojson))


def get_shape(rel_id):
    print(f'Getting shape for relation {rel_id}...')
    rel_query = f'rel({rel_id}); out body; >; out skel qt;'
    rel_path = Path(f'{DATA_DIR}{rel_id}.geojson')
    if not rel_path.exists():
        save_as_geojson(rel_query, rel_path)
    data = json.loads(rel_path.read_text())
    feats = data['features']
    rel_feats = [ f for f in feats if f['properties']['type'] == 'relation' ]
    if len(rel_feats) != 1:
        raise Exception('unexpected number of polygons')
    return shape(rel_feats[0]['geometry'])

def write_geojson(shapes, path):
    feats = []
    for shp in shapes:
        feat = { 'type': 'Feature', 'properties': {} }
        feat['geometry'] = mapping(shp)
        feats.append(feat)
    out = { 'type': 'FeatureCollection', 'features': feats }
    path.write_text(json.dumps(out))


def resolve_rel_id(name, rels_data):
    """Resolve a name to a relation ID by looking in extras and extras_in_control."""
    if name in rels_data.get('extras', {}):
        return rels_data['extras'][name]
    if name in rels_data.get('extras_in_control', {}):
        return rels_data['extras_in_control'][name]
    raise ValueError(f"Unknown relation name: {name}")


def build_indian_state_shapes(rels_data, all_shapes):
    """Build indian state shapes by combining relations from indian_states config."""
    indian_states = {}
    for state_name, component_names in rels_data.get('indian_states', {}).items():
        component_shapes = []
        for name in component_names:
            rel_id = resolve_rel_id(name, rels_data)
            if rel_id not in all_shapes:
                all_shapes[rel_id] = get_shape(rel_id)
            component_shapes.append(all_shapes[rel_id])
        indian_states[state_name] = union_all(component_shapes)
    return indian_states


if __name__ == '__main__':
    Path(DATA_DIR).mkdir(parents=True, exist_ok=True)
    rels_data = json.loads(Path('rels_osm.json').read_text())
    rel_ind = rels_data['India']
    rel_pak = rels_data['Pakistan']
    ind_shape = get_shape(rel_ind)
    pak_shape = get_shape(rel_pak)
    ind_shape_bound = ind_shape.boundary
    pak_shape_bound = pak_shape.boundary
    
    # Cache all downloaded shapes by rel_id
    all_shapes = {
        rel_ind: ind_shape,
        rel_pak: pak_shape,
    }
    
    extra_shapes = {}
    for rel_name, rel_id in rels_data['extras'].items():
        if rel_id not in all_shapes:
            all_shapes[rel_id] = get_shape(rel_id)
        extra_shapes[rel_name] = { 'shape': all_shapes[rel_id], 'rel_id': rel_id }

    ind_official_shape = union_all([ind_shape] + [ e['shape'] for e in extra_shapes.values() ])
    ind_official_shape_bound = ind_official_shape.boundary
    official_diff_shape_bound = difference(ind_official_shape_bound, ind_shape_bound)
    official_diff_shape_bound = difference(official_diff_shape_bound, pak_shape_bound)
    write_geojson([official_diff_shape_bound], Path(f'{DATA_DIR}to_add.geojson'))

    ind_intersect_official = ind_shape_bound.intersection(ind_official_shape)
    pak_intersect_official = pak_shape_bound.intersection(ind_official_shape)

    to_del = []
    to_del.append(difference(ind_intersect_official, ind_official_shape_bound))
    to_del.append(difference(pak_intersect_official, ind_official_shape_bound))
    to_del_combined = union_all(to_del)
    write_geojson(to_del, Path(f'{DATA_DIR}to_del.geojson'))

    # Generate disputed area boundaries on India's official boundary
    # These are boundaries of disputed regions (extras + extras_in_control) that overlap
    # with India's official boundary, excluding parts already in to_add layer
    extras_in_control = {}
    for rel_name, rel_id in rels_data.get('extras_in_control', {}).items():
        if rel_id not in all_shapes:
            all_shapes[rel_id] = get_shape(rel_id)
        extras_in_control[rel_name] = { 'shape': all_shapes[rel_id], 'rel_id': rel_id }
    
    # Combine all disputed area shapes
    all_disputed_shapes = {**extra_shapes, **extras_in_control}
    
    to_add_disp = []
    for rel_name, disp_data in all_disputed_shapes.items():
        disp_bound = disp_data['shape'].boundary
        # Get the part of disputed boundary that's on India's official boundary
        disp_on_boundary = disp_bound.intersection(ind_official_shape_bound)
        # Remove parts that are already in to_add layer
        disp_on_boundary = difference(disp_on_boundary, official_diff_shape_bound)
        if not disp_on_boundary.is_empty:
            to_add_disp.append(disp_on_boundary)
    write_geojson(to_add_disp, Path(f'{DATA_DIR}to_add_disp.geojson'))
    
    # Build indian state shapes from combinations
    indian_states = build_indian_state_shapes(rels_data, all_shapes)
    
    # Download chinese state relations
    chinese_states = {}
    for state_name, rel_id in rels_data.get('chinese_states', {}).items():
        if rel_id not in all_shapes:
            all_shapes[rel_id] = get_shape(rel_id)
        chinese_states[state_name] = all_shapes[rel_id]
    
    # Create to-del-osm-internal: chinese state boundaries within India's claimed boundary
    # Remove parts that are on India's official boundary or on the main deletions
    to_del_internal = []
    for state_name, state_shape in chinese_states.items():
        state_bound = state_shape.boundary
        # Get parts of chinese state boundary that are inside India's official shape
        inside_india = intersection(state_bound, ind_official_shape)
        # Remove parts that are on India's official boundary
        inside_india = difference(inside_india, ind_official_shape_bound)
        # Remove parts that are on the main deletions (to_del)
        inside_india = difference(inside_india, to_del_combined)
        if not inside_india.is_empty:
            to_del_internal.append(inside_india)
    to_del_internal_combined = union_all(to_del_internal) if to_del_internal else None
    write_geojson(to_del_internal, Path(f'{DATA_DIR}to_del_internal.geojson'))
    
    # Create to-add-osm-internal: indian state boundaries that run along the main deletions (to_del)
    # Buffer the deletions slightly and find state boundaries that fall within that buffer
    BUFFER_DISTANCE = 1e-5  # ~1 meter buffer in degrees
    to_del_buffered = to_del_combined.buffer(BUFFER_DISTANCE)
    
    to_add_internal = []
    for state_name, state_shape in indian_states.items():
        state_bound = state_shape.boundary
        # Get parts of indian state boundary that are inside India's official shape
        inside_india = intersection(state_bound, ind_official_shape)
        # Only keep parts that run along the main deletions (within buffer)
        along_deletions = intersection(inside_india, to_del_buffered)
        if not along_deletions.is_empty:
            to_add_internal.append(along_deletions)
    
    # Filter out points and tiny line segments from to_add_internal
    # First merge lines to connect adjacent segments, then filter small isolated pieces
    MIN_LENGTH = 1e-6  # Minimum length threshold (in degrees)
    
    # Flatten all geometries to get individual LineStrings for linemerge
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







