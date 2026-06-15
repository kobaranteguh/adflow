from setuptools import setup, find_packages

setup(
    name="adflow-sdk",
    version="0.1.0",
    description="Official Python SDK for the AdFlow bridge — Meta Marketing (Ads), Threads, and free Facebook Pages & Instagram without your own Meta App Review.",
    long_description=open("README.md", encoding="utf-8").read(),
    long_description_content_type="text/markdown",
    author="AdFlow",
    license="MIT",
    url="https://github.com/adflow/sdk-python",
    packages=find_packages(),
    python_requires=">=3.8",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
    ],
)
