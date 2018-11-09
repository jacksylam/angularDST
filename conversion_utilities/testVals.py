import json
import os

os.chdir("output")

with open('sc0.covjson') as f:
    value = json.load(f)["ranges"]["recharge"]["values"]

    
index = 404 * 887 + 264

print(value[index])
