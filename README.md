# Cycle Crash Visualization

## Install

Create a virutalenv and activate it  
Linux Platform:
```console
$ py -3 -m venv venv
$ venv\Scripts\activate.bat
```
Or on Windows cmd:
```console
> py -3 -m venv venv
> venv\Scripts\activate.bat
```
Install cycle crash
```console
$ pip install -e .
```
## Prepare data
Downlaod the Motor Vehicle Collisions - Crashes csv file `https://data.cityofnewyork.us/api/views/h9gi-nx95/rows.csv?accessType=DOWNLOAD`, 
and move into `cycle_crash_viz/cycle_crash

## Run the application
First generate the sqlite database, then run the flask app
```console
$ export FLASK_APP=cycle_crash
$ export FLASK_ENV=development
$ flask init-db
$ python -m flask run
```
Or on Windows cmd:
```console
> set FLASK_APP=cycle_crash
> set FLASK_ENV=development
> flask init-db
> python -m flask run
```
Open <http://127.0.0.1:5000> in a browser.

## API
Get the crash information by borough `("Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island")`   
`GET /crash/{borough_name}`

Get all bike station information  
`GET /stations`
