#!/bin/bash

osm_ts=$(date +%Y%m%d_%H%M%S)
suffix="osm_$osm_ts"
uv run fix_bounds_osm.py

wget -P data/ne https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_0_countries.zip
wget -P data/ne https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_0_countries_ind.zip
wget -P data/ne https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_0_countries_chn.zip
wget -P data/ne https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_0_countries_pak.zip
wget -P data/ne https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_1_states_provinces.zip
unzip data/ne/ne_10m_admin_0_countries.zip -d data/ne/base
unzip data/ne/ne_10m_admin_0_countries_ind.zip -d data/ne/ind
unzip data/ne/ne_10m_admin_0_countries_chn.zip -d data/ne/chn
unzip data/ne/ne_10m_admin_0_countries_pak.zip -d data/ne/pak
unzip data/ne/ne_10m_admin_1_states_provinces.zip -d data/ne/states

ne_version=$(cat data/ne/base/ne_10m_admin_0_countries.VERSION.txt)
# remove trailing newline
ne_version=$(echo -n $ne_version | tr -d '\r')
suffix=${suffix}"_ne_$ne_version"
uv run fix_bounds_ne.py

echo ${suffix} > data/version.txt
echo "export const dataVersion = '${suffix}';" > data/version.js

fname="india_boundary_corrections.pmtiles"

tippecanoe -A '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>, <a href="https://www.naturalearthdata.com">Natural Earth</a> (public domain)' \
  -L'{"file": "data/osm/to_add.geojson", "layer": "to-add-osm"}' \
  -L'{"file": "data/osm/to_del.geojson", "layer": "to-del-osm"}' \
  -L'{"file": "data/osm/to_add_disp.geojson", "layer": "to-add-osm-disp"}' \
  -L'{"file": "data/osm/to_add_disp.geojson", "layer": "to-del-osm-disp"}' \
  -L'{"file": "data/osm/to_add_internal.geojson", "layer": "to-add-osm-internal"}' \
  -L'{"file": "data/osm/to_del_internal.geojson", "layer": "to-del-osm-internal"}' \
  -L'{"file": "data/ne/to_add.geojson", "layer": "to-add-ne"}' \
  -L'{"file": "data/ne/to_del.geojson", "layer": "to-del-ne"}' \
  -L'{"file": "data/ne/to_add_disp.geojson", "layer": "to-add-ne-disp"}' \
  -L'{"file": "data/ne/to_add_disp.geojson", "layer": "to-del-ne-disp"}' \
  -L'{"file": "data/ne/to_add_internal.geojson", "layer": "to-add-ne-internal"}' \
  -L'{"file": "data/ne/to_del_internal.geojson", "layer": "to-del-ne-internal"}' \
  -o data/${fname}

# Copy generated files to package root for npm publishing
cp data/${fname} ../${fname}
cp data/version.js ../data_version.js

# Create .gz copy for CDN workaround (see pmtiles-filename-note.md)
cp ../${fname} ../${fname}.gz

echo "Generated ${fname} and version.js, copied to package root"
echo "Created ${fname}.gz for CDN workaround (see pmtiles-filename-note.md)"

