import pandas as pd
from flask import (
    Blueprint, render_template, jsonify
)

from cycle_crash.db import get_db

bp = Blueprint('api', __name__)


@bp.route('/')
def home():
    return render_template('index.html')


@bp.route('/crash/<borough>')
def show_crash(borough):
    db = get_db()
    borough = borough.upper()
    df = pd.read_sql("select * from crashes where BOROUGH = ?", db, params=(borough,))
    return jsonify(df.to_dict('records'))


@bp.route('/stations')
def show_stations():
    db = get_db()
    df = pd.read_sql("select * from stations", db)
    df.to_dict('records')

    return jsonify(df.to_dict('records'))
