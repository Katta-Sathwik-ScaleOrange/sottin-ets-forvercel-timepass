# process_microsoft_footprints.py
import planetary_computer
from pystac_client import Client
import geopandas as gpd
import os

# Create the data directory if it doesn't exist
os.makedirs('data', exist_ok=True)

# 1. Connect to Microsoft's Planetary Computer API
print("Connecting to Planetary Computer...")
catalog = Client.open(
    "https://planetarycomputer.microsoft.com/api/stac/v1",
    modifier=planetary_computer.sign_inplace,
)

# 2. Define your exact bounding box (Tellapur / Nallagandla)
# Format: [West Longitude, South Latitude, East Longitude, North Latitude]
bbox = [78.23, 17.40, 78.33, 17.53]

# 3. Ask the API which dataset tiles intersect with your bounding box
print("Searching for building data in this area...")
search = catalog.search(
    collections=["ms-buildings"],
    bbox=bbox,
)
items = list(search.items())

if not items:
    print("No data found for this bounding box.")
else:
    print(f"Found {len(items)} Microsoft data tile(s). Loading data directly from the cloud...")
    
    # 4. Get the direct cloud URL of the first matching tile
    # planetary_computer handles the secure authentication automatically
    asset_url = items[0].assets["data"].href
    
    # 5. Read the Parquet file directly into Pandas without saving the massive raw file to your PC!
    df = gpd.read_parquet(asset_url)
    
    # 6. The tile is huge (usually covers a whole state). 
    # Use spatial indexing (.cx) to crop it down to just your Tellapur bounding box.
    tellapur_buildings = df.cx[bbox[0]:bbox[2], bbox[1]:bbox[3]]
    
    print(f"Successfully cropped {len(tellapur_buildings)} buildings in Tellapur.")
    
    # 7. Save just your local area as a GeoJSON
    output_file = 'data/microsoft-footprints-tellapur.geojson'
    tellapur_buildings.to_file(output_file, driver='GeoJSON')
    print(f"Saved cleanly to {output_file}")