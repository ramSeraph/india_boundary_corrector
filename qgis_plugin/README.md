# India Boundary Corrector - QGIS Plugin

A QGIS plugin that corrects India's boundaries on XYZ raster tile layers to show the official Indian government position on disputed territories (Kashmir, Arunachal Pradesh).

## How It Works

The plugin runs a local proxy server that:
1. Receives tile requests from QGIS
2. Fetches the original tile from the upstream server
3. Applies boundary corrections using vector data from PMTiles
4. Returns the corrected tile to QGIS

## Installation

1. Copy the `qgis_plugin` folder to your QGIS plugins directory:
   - **Linux**: `~/.local/share/QGIS/QGIS3/profiles/default/python/plugins/india_boundary_corrector`
   - **macOS**: `~/Library/Application Support/QGIS/QGIS3/profiles/default/python/plugins/india_boundary_corrector`
   - **Windows**: `%APPDATA%\QGIS\QGIS3\profiles\default\python\plugins\india_boundary_corrector`

2. Copy the `india_boundary_corrections.pmtiles` file from `packages/data/` to the plugin directory.

3. Restart QGIS and enable the plugin in the Plugin Manager.

## Usage

1. Click the "India Boundary Corrector" button in the toolbar (or use the Raster menu)
2. The plugin will start a local proxy server (default port: 19876)
3. Add XYZ tile layers using the proxy URL format:
   ```
   http://127.0.0.1:19876/proxy/{encoded_original_url}
   ```

### Example URLs

**OpenStreetMap:**
```
http://127.0.0.1:19876/proxy/https%3A%2F%2Ftile.openstreetmap.org%2F{z}%2F{x}%2F{y}.png
```

**CartoDB Dark:**
```
http://127.0.0.1:19876/proxy/https%3A%2F%2Fa.basemaps.cartocdn.com%2Fdark_all%2F{z}%2F{x}%2F{y}.png
```

## Supported Tile Providers

- OpenStreetMap Standard
- CartoDB Dark (dark_all, dark_nolabels)
- CartoDB Light (light_all, light_nolabels)
- CartoDB Voyager (voyager, voyager_nolabels, voyager_labels_under)
- OpenTopoMap

## Requirements

- QGIS 3.22 or later
- Python 3.8+
- Pillow (PIL) library

## Dependencies

The plugin requires Pillow for image manipulation. If not available, install it:

```bash
pip install Pillow
```

Or in QGIS Python console:
```python
import pip
pip.main(['install', 'Pillow'])
```

## Development Status

**Work in Progress** - This plugin is experimental. The tile correction logic needs to be completed:

- [ ] Full PMTiles parsing and tile lookup
- [ ] MVT (Mapbox Vector Tile) parsing for correction features
- [ ] Proper median blur for deletion paths
- [ ] Dash array support for line styles

## License

Unlicense
