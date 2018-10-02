var express = require('express');
var router = express.Router();

var connInfo = require('./db_config.js');
const marklogic = require('marklogic');
const db = marklogic.createDatabaseClient(connInfo);

function load_patients() {
    const patients = require("./patient.json");
    patients.forEach(patient => {
        var record = {
            'uri' : '/patient/' + patient.patient_id,
            'content' : patient,
            'collections' : ['patient']
        };
        db.documents.write(record).result( 
            function(response) {
                console.log('Loaded the following documents:');
                response.documents.forEach(function(document) {
                    console.log(document);
                });
            }, 
            function(error) {
                console.log(JSON.stringify(error, null, 2));
            }
        );
    });
}

function load_doctors() {
    const doctors = require("./doctor.json");
    doctors.forEach(doctor => {
        var record = {
            'uri' : '/doctor/' + doctor.doctor_id,
            'content' : doctor,
            'collections' : ['doctor']
        };
        db.documents.write(record).result( 
            function(response) {
                console.log('Loaded the following documents:');
                response.documents.forEach(function(document) {
                    console.log(document);
                });
            }, 
            function(error) {
                console.log(JSON.stringify(error, null, 2));
            }
        );
    });
}

router.get('/load', function (request, response) {
    load_patients();
    load_doctors();
    response.send('Database initialized');
});

module.exports = router;