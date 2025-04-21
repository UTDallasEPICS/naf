const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('RossClark.html', 'utf-8');
const $ = cheerio.load(html);

const jsonData = {
  fullName: $('meta[property="profile:first_name"]').attr('content') + ' ' + $('meta[property="profile:last_name"]').attr('content'),
  jobTitle: $('meta[property="og:title"]').attr('content'),
  location: $('script[type="application/ld+json"]').html()?.match(/"addressLocality":"(.*?)"/)?.[1],
  linkedinLink: $('meta[property="og:url"]').attr('content'),
  email: $('a[href^="mailto:"]').attr('href')?.replace('mailto:', null),
  phoneNumber: $('span.phone').text(),
  highSchool: $('meta[property="profile:high_school"]').attr('content'),
  HSGraduationYear: $('meta[property="profile:hs_graduation_year"]').attr('content'),
  NAFAcademy: $('meta[property="profile:NAF_academy"]').attr('content') === 'true',
  NAFTrackCertified: $('meta[property="profile:NAF_certified"]').attr('content') === 'true',
  address: $('script[type="application/ld+json"]').html()?.match(/"address":"(.*?)"/)?.[1],
  city: $('script[type="application/ld+json"]').html()?.match(/"addressLocality":"(.*?)"/)?.[1],
  state: $('script[type="application/ld+json"]').html()?.match(/"addressRegion":"(.*?)"/)?.[1],
  zipCode: $('script[type="application/ld+json"]').html()?.match(/"postalCode":"(.*?)"/)?.[1],
  birthdate: $('meta[property="profile:birthdate"]').attr('content'),
  militaryBranchServed: $('meta[property="profile:military_branch"]').attr('content'),
  currentJob: $('meta[property="profile:current_job"]').attr('content'),
  collegeMajor: $('meta[property="profile:college_major"]').attr('content'),
  universityGradYear: $('meta[property="profile:university_graduation_year"]').attr('content'),
  university: $('meta[property="profile:university"]').attr('content'),
  degree: $('meta[property="profile:degree"]').attr('content'),
  schoolDistrict: $('meta[property="profile:school_district"]').attr('content'),
  internshipCompany1: $('meta[property="profile:internship_company_1"]').attr('content'),
  internshipEndDate1: $('meta[property="profile:internship_end_date_1"]').attr('content'),
};

console.log(JSON.stringify(jsonData, null, 2));

const moreProfiles = [];

$('a.base-aside-card').each((i, el) => {
  const name = $(el).find('h3.base-aside-card__title').text().trim();
  let url = $(el).attr('href');
  
  if (name && url) {
    // Ensure the URL is absolute (LinkedIn URLs are relative, so prepend 'https://www.linkedin.com')
    if (!url.startsWith('http')) {
      url = 'https://www.linkedin.com' + url;
    }

    moreProfiles.push({ name, url });
  }
});

console.log(moreProfiles);
