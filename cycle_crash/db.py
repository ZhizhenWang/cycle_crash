import click
import json
import numpy as np
import pandas as pd
import sqlite3
from flask import current_app, g
from flask.cli import with_appcontext
from urllib.request import urlopen


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


def get_cycle_collision_data() -> pd.DataFrame:
    # in order to get the up to date data, could be replaced
    #  with api, if registered account https://data.cityofnewyork.us/profile/edit/developer_settings
    with current_app.open_resource('Motor_Vehicle_Collisions_-_Crashes.csv') as f:
        raw_data = pd.read_csv(f, low_memory=False)
        raw_data = raw_data[(raw_data['NUMBER OF CYCLIST KILLED'] != 0) | (raw_data['NUMBER OF CYCLIST KILLED'] != 0)]
        raw_data = raw_data[(raw_data['LONGITUDE'].notnull()) & (raw_data['LATITUDE'].notnull())]

        raw_data = raw_data.apply(lambda x: x.str.strip() if x.dtype == "object" else x)  # strip whitespace value

        raw_data = raw_data[raw_data.BOROUGH.notnull()]  # remove empty borough rows
        raw_data.replace(np.nan, '', inplace=True)
        return raw_data


def init_db():
    db = get_db()
    df = get_station_data()
    df.to_sql('stations', db, if_exists='replace', index=False)

    df = get_cycle_collision_data()
    df.to_sql('crashes', db, if_exists='replace', index=False)


@click.command('init-db')
@with_appcontext
def init_db_command():
    """Clear the existing data and create new tables."""
    init_db()
    click.echo('Initialized the database.')


def init_app(app):
    """Register database functions with the Flask app. This is called by
    the application factory.
    """
    app.teardown_appcontext(close_db)
    app.cli.add_command(init_db_command)
