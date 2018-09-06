rechargeParser.py

Place set of covjson files for landcovers/scenarios in resources folder

Usage:
python rechargeParser.py fname_pattern number_of_scenarios number_of_landcovers [skipped_landcovers]

fname_pattern: format of the names of the source files with the scenario number represented by '$' and the land cover code represented by '#'
example: for files of the format "testunit9__sc0_0-fin.covjson" enter "testunit9__sc$_#-fin.covjson"
number_of_scenarios: how many scenarios there are
number_of_landcovers: how many land covers there are (including skipped values) (i.e. the highest land cover code + 1)
skipped_landcovers: comma separated list of any land cover codes that do not have files

Places generated files in output folder