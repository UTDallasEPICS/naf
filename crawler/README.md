# NAF Alumni Tracking System

## Project Overview
The **NAF Alumni Tracking System** is a web-scraping project designed to gather and organize data about NAF alumni using LinkedIn and other platforms. The goal is to automate the collection, updating, and maintenance of alumni records to support long-term engagement, build connections, and analyze career outcomes.

## Features
- **Automated Web Scraping**: Collects alumni data, including:
  - Names
  - Email addresses
  - Current roles and employers
  - Locations
  - Industries
  - Skillsets
  - Degrees
- **Structured Data Compilation**:
  - Data is compiled into a structured format such as spreadsheets or a user-friendly dashboard.
- **Alumni Dashboard**:
  - Functions as an alumni "finder"
  - Uses keywords, geographic data, and other identifiers to locate disconnected alumni
  - Helps send invitations to reconnect with NAF’s network
- **Data Analysis Support**:
  - Enables tracking of alumni career paths, achievements, and locations
  - Supports NAF’s successful development initiatives

## Technology Stack
- **Frontend**: To be determined (e.g., React, Next.js, Vue.js)
- **Backend**: To be determined (e.g., Node.js, Django, Flask)
- **Database**: To be determined (e.g., PostgreSQL, MongoDB, Firebase)
- **Web Scraping Tools**: Selenium, BeautifulSoup, Scrapy, or other APIs

## How to Run
- TS files are located in the src folder
- **TS to JS conversion**: ``` npm run build ```
- **Execute JS file**: ``` node dist/main.js ```
- **TroubleShooting**: 
    - **Mismatch Node Verison:** If there is a error stating File ``` '@tsconfig/node22/tsconfig.json' ``` not found, make sure to update to Node 22 and also run the command ``` npm install -D @tsconfig/node22 ```