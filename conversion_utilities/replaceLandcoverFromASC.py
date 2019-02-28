import json
import sys

with open("resources/landcover.covjson", "r+") as f:
    data = json.load(f)
    data["ranges"]["cover"]["values"] = []
    with open(sys.argv[1]) as lc:
        i = 0
        for line in lc:
            if i > 5:
                data["ranges"]["cover"]["values"] += line.strip().split(" ")
            i = i + 1
    f.seek(0)
    json.dump(data, f)
    f.truncate()
