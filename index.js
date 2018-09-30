// ========================== Temporal Hospital REST API =======================

const express        = require('express');
const bodyParser     = require('body-parser');
const port           = 8123;
const app            = express();

app.use(bodyParser.json());         // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
})); 

app.get('/', function(request, response) {
    response.send('Temporal Hospital REST API');
});

app.listen(port, () => {
    console.log('Temporal Hospital REST API is running on ' + port);
});