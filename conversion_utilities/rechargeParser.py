import json
import sys
import os


input_fname_pattern = sys.argv[1]
sc_range = int(sys.argv[2])
lc_range = int(sys.argv[3])
exclude = []
if(len(sys.argv) == 5):
    exclude = sys.argv[4].split(',')
data = []

def write_scenario_to_covjson(land_covers, template, sc_fname, data):
    values = []
    
    i = 0
    for cover in lc:
        if cover != 0:
            code = cover - 1
            v = data[code]
            r = v[i]
            values.append(round(r, 3))
        else:
            values.append(0)
        i = i + 1
    
    template["ranges"]["recharge"]["values"] = values
    
    with open(sc_fname, 'w') as sc_file:
        json.dump(template, sc_file)



os.chdir("resources")

for i in range(sc_range):
    data.append([])
    for j in [x for x in range(lc_range) if x not in exclude]:
        fname = input_fname_pattern.replace("$", str(i))
        fname = fname.replace("#", str(j))
        with open(fname) as f:
            data[i].append(json.load(f)["ranges"]["recharge"]["values"])

with open('landcover.covjson') as f:
    lc = json.load(f)["ranges"]["cover"]["values"]    


with open('recharge_template.covjson') as f:
    out_template = json.load(f)


os.chdir("../output")

for i in range(sc_range):
    write_scenario_to_covjson(lc, out_template, "sc" + str(i) + ".covjson", data[i])






















        
