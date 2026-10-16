import {defineConfig} from '@playwright/test';
export default defineConfig({outputDir:'solo-test-results',testDir:'./tests',testMatch:'solo.spec.js',workers:1,timeout:30000,use:{viewport:{width:1280,height:800},launchOptions:{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']}}});
