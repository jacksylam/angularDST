import json
import os

os.chdir("resources")

with open('testset14_sc0_2-fin.covjson') as f:
    value = json.load(f)["ranges"]["recharge"]["values"]

    
index = 404 * 887 + 264

print(value[index])
