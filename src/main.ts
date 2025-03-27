import { Builder } from 'selenium-webdriver';
import { Options } from 'selenium-webdriver/chrome.js'; // Note .js extension

async function headlessGoogle() {
    const chromeOptions = new Options();
    chromeOptions.addArguments(
        '--headless=new',
        '--no-sandbox',
        '--disable-dev-shm-usage'        
    );

    const driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(chromeOptions)
        .build();

    try {
        await driver.get('https://google.com');
        console.log(await driver.getTitle());
    } finally {
        await driver.quit();
    }
}

headlessGoogle().catch(console.error);