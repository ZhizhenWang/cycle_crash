import json
import sqlite3
from urllib.request import urlopen

import click
import numpy as np
import pandas as pd
import requests
from flask import current_app, g
from flask.cli import with_appcontext


def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(
            current_app.config['DATABASE'],
            detect_types=sqlite3.PARSE_DECLTYPES
        )
        g.db.row_factory = sqlite3.Row

    return g.db


def close_db(e=None):
    db = g.pop('db', None)

    if db is not None:
        db.close()


def get_station_data() -> pd.DataFrame:
    with urlopen("https://feeds.citibikenyc.com/stations/stations.json") as url:
        data = json.loads(url.read())
    df = pd.read_json(json.dumps(data['stationBeanList']), 'records')
    return df


def get_cycle_collision_data(limit:int) -> pd.DataFrame:
    # in order to get updated data, could be replaced
    #  with api, if registered account https://data.cityofnewyork.us/profile/edit/developer_settings
    url = "https://data.cityofnewyork.us/resource/h9gi-nx95.json"
    post_params = {
              '$where' : '(number_of_cyclist_injured > 0 OR number_of_cyclist_killed >0) AND location IS NOT NULL AND borough IS NOT NULL',
              '$order' : 'accident_date DESC',
              '$limit' : limit if limit else 100,
              '$$app_token' : 'xq4w64sTYpeDsjbThy6su63SM'
              }
    r = requests.get(url, params=post_params)
    df = pd.read_json(r.content, 'records')
    df.columns = df.columns.str.upper()
    
    df = df.apply(lambda x: x.str.strip() if x.dtype == "object" else x)  # strip whitespace value

    # format date and time
    df.ACCIDENT_DATE = pd.to_datetime(df['ACCIDENT_DATE'].str.slice(stop=10), format="%Y-%m-%d").dt.strftime('%Y-%m-%d')
    df.ACCIDENT_TIME = pd.to_datetime(df['ACCIDENT_TIME'], format="%H:%M").dt.strftime('%H:%M')

    # df = df[df.BOROUGH.notnull()]  # remove empty borough rows
    df.replace(np.nan, '', inplace=True)
    return df


def init_db(limit):
    db = get_db()
    df = get_station_data()
    df.to_sql('stations', db, if_exists='replace', index=False)

    df = get_cycle_collision_data(limit)
    df.to_sql('crashes', db, if_exists='replace', index=False)


# defines a command line command called init-db
@click.command('init-db')
@click.argument('limit', required=False)
@with_appcontext
def init_db_command(limit):
    """Clear the existing data and create new tables."""
    init_db(limit)
    click.echo('Initialized the database.')


def init_app(app):
    """Register database functions with the Flask app. This is called by
    the application factory.
    """
    app.teardown_appcontext(close_db)
    app.cli.add_command(init_db_command)
