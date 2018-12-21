import json

lc_fname = "covjson/landcover.covjson"
aq_fname = "Oahu__75m__AQUI_CODE.asc"
with open(lc_fname) as f:
    lcdata = json.load(f)
    
aquis = []    
with open(aq_fname) as f:
    i = 0
    for line in f:
        if i > 5:
            aquis.extend(line.strip().split(" "))
        i = i + 1

for i, aqui in enumerate(aquis):
    if aqui == "0":
        lcdata["ranges"]["cover"]["values"][i] = 0;

with open(lc_fname, 'w') as f:
    json.dump(lcdata, f)

