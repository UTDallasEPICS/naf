# NAF Alumni Tracking System

## Project Overview
The **NAF Alumni Tracking System** is a web-scraping project intended to automate the gathering, organization, and maintenance of NAF alumni data, primarily from LinkedIn. The core goal is to build a comprehensive database of alumni records. This database will support NAF in fostering long-term engagement with its alumni, building connections, and analyzing career outcomes and trajectories to support NAF’s development initiatives.

## User Roles:
- **System Administrator/Data Manager**: This user is responsible for running the scraping scripts, managing the collected data, ensuring the systems operational integritty, and protentially configuring API keys and or parameters. 

## Functional Requirements
- **Data Collection & Processing:**
  - **Automated Profile Searching:**
    - Utilize Google Custom Search API to find LinkedIn profies based on predefinted queries (e.g., site:linkedin.com/in "NAFTrack").
    - Fetch the search resultes in pages.
  - **LinkedIn Profile Scraping:**
    - Navigate to individual LinkedIn profile URLs obtained from the search results.
    - Attempt to bypass LinkedIn's authentication wall using different methods (e.g., refer manipulation, retries, simulating normal browser).
    - Simulate human-like behavior (scrolling,delays) to reduce chances of being blocked.
    - Saved the HTML content of accessible LinkedIn profiles to database.
  - **Data Extraction and Storage:**
    - Parse the saved HTML files to extract specific alumni data points. The ```html_json.ts``` script extracts:
      - Full Name
      - Job Title
      - Location (City, State, Country)
      - LinkedIn Profile URL
      - Email (if available)
      - Phone Number (if available)
      - High School & Graduation Year
      - NAFAcademy & NAFTrack Certified status
      - Current Job
      - University & Graduation Year
      - Degree
      - Internship Company & End Date
    - Convert the extracted data into a structured JSON format.
    - Store the JSON data in a PostgreSQL database, linking it to the profile URL.
    - Handle conversion of multiplke HTML files to JSON as soon as they are processed.

## Third Party Integrations
- **Google Custom Search API:**
  - Used to find LinkedIn profiles based on search queries. The API key and Search Engine ID are required and managed via environment variables as show in `env.example`.
- **Amazon Web Services:**
  - Used to asynchronusly run the crawler to have mass amounts of data in the database **(Has not been set up yet)**
- **PgAdmin**
  - Used to manage the database using a admin account where every JSON file is stored 

## Technology Stack
- **Language**: TypeScript
- **Runtime Environment**: Node.js (implied by TypeScript usage)
- **Web Scraping & Automation**:
  - **Selenium Webdriver**: Used for browser automation adn interacting with web pages to scrape LinkedIn profiles.
  - **Cheerio**: Used for parsing HTML content extracted from LinkedIN profiles to JSON.
- **Database**:
  - **PostgreSQL**: Alumni data is stored in a PostgreSQL database in JSON structured format
  - **pg (Node.js PostgreSQL client)**: Used to connect to and interact with the PostgreSQL database.
- **Enviornment Management**: `dotenv`: Used to load environment variables (e.g., API keys, database credentials) from a `.env` file.

## Setting Up Development Environment
- Install [git](https://git-scm.com/downloads), [Node.js](https://nodejs.org/en/download) 22 or higher, and [Docker Desktop](https://www.docker.com/products/docker-desktop/) on your computer.
- In a terminal:
  - Run `git clone https://github.com/UTDallasEPICS/naf.git` to clone the repository.
  - Run `cd analyzer` and `npm install` to install dependencies for the analyzer project. 
    - If there is a error stating File `'@tsconfig/node22/tsconfig.json'` not found, make sure to update to Node 22 and also run the command `npm install -D @tsconfig/node22`
  - Run `cd ..` to change directory out of the analyzer, then run `cd crawler` and `npm install` to install dependencies for the crawler project. 
- Make a copy of the file `.env.example` and rename it to `.env`.
- Fill out the variables in the `.env`. file using the directions in the comments.
  - These variables are used by the code to configure database access and credentials to access the Google Search API. 
- Run `docker compose up` in the root directory to run the analyzer, crawler, and a pgAdmin instance (a tool allowing you to inspect a PostgreSQL database visually).