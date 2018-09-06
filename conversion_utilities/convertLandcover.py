with open("landcovers.txt", 'w') as new:
    with open("Oahu__75m__2010_landcover.asc", 'r') as f:
        i = 0
        for line in f:
            if i > 5:
                for cover in line.strip().split(" "):
                    new.write(cover + ",")
            i = i + 1
