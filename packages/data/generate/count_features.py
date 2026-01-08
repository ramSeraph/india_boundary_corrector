# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "pmtiles",
#     "mapbox-vector-tile",
# ]
# ///

"""Count the number of features in a PMTiles file."""

import sys
import gzip
from pathlib import Path
from pmtiles.reader import Reader, MmapSource, all_tiles
import mapbox_vector_tile

def decompress_tile(tile_data: bytes) -> bytes:
    """Decompress tile data if it's gzip compressed."""
    # Check for gzip magic bytes
    if tile_data[:2] == b'\x1f\x8b':
        return gzip.decompress(tile_data)
    return tile_data

def count_features(pmtiles_path: str) -> dict:
    """Count features per layer in a PMTiles file."""
    path = Path(pmtiles_path)
    if not path.exists():
        raise FileNotFoundError(f"PMTiles file not found: {pmtiles_path}")
    
    layer_counts = {}
    total_features = 0
    tile_count = 0
    
    with open(path, 'rb') as f:
        source = MmapSource(f)
        reader = Reader(source)
        
        # Iterate over all tiles using all_tiles helper
        for (z, x, y), tile_data in all_tiles(reader.get_bytes):
            tile_count += 1
            # Decompress if needed
            tile_data = decompress_tile(tile_data)
            # Decode the vector tile using mapbox-vector-tile
            decoded = mapbox_vector_tile.decode(tile_data)
            
            for layer_name, layer_data in decoded.items():
                feature_count = len(layer_data.get('features', []))
                layer_counts[layer_name] = layer_counts.get(layer_name, 0) + feature_count
                total_features += feature_count
    
    return {
        'layers': layer_counts,
        'total_features': total_features,
        'tile_count': tile_count,
    }


if __name__ == '__main__':
    pmtiles_path = sys.argv[1] if len(sys.argv) > 1 else '../india_boundary_corrections.pmtiles'
    
    print(f"Counting features in: {pmtiles_path}")
    print()
    
    result = count_features(pmtiles_path)
    
    print(f"Tiles: {result['tile_count']}")
    print()
    print("Features per layer:")
    for layer_name, count in sorted(result['layers'].items()):
        print(f"  {layer_name}: {count}")
    print()
    print(f"Total features: {result['total_features']}")
