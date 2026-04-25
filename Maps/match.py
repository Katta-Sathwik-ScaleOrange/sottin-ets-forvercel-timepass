# Spatial join: match MS footprints with OSM named points
import geopandas as gpd

ms_buildings = gpd.read_file('data/microsoft-footprints-tellapur.geojson')
osm_named = gpd.read_file('data/osm-polygons.geojson')

# Get centroids of OSM named polygons
osm_named['centroid'] = osm_named.geometry.centroid
osm_centroids = osm_named.set_geometry('centroid')

# Find which MS footprint contains each OSM centroid
joined = gpd.sjoin(osm_centroids, ms_buildings, how='left', predicate='within')

# Result: MS building polygon matched to OSM name
joined.to_file('data/named-polygons.geojson', driver='GeoJSON')