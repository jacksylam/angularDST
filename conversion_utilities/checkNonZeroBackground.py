covers = []
with open("landCover.asc", 'r') as f:
    i = 0
    for line in f:
        if i > 5:
            covers += line.strip().split(" ")
        i = i + 1

rc = []
with open("recharge_inches_per_year_baseline_rainfall.asc", 'r') as f:
    i = 0
    for line in f:
        if i > 5:
            rc += line.strip().split(" ")
        i = i + 1

for i in range(len(covers)):
    if covers[i] == 0 and rc[i] != 0:
        print("error\n")
