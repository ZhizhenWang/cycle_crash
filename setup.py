from setuptools import find_packages, setup

setup(
    name='cycle_crash',
    version='1.0.0',
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    install_requires=[
        'flask',
        'pandas',
        'requests'
    ],
)
