import bodyParser from 'body-parser';

export const jsonParser = bodyParser.json();
export const urlParser = bodyParser.urlencoded({
  extended: true
});
