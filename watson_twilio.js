require('dotenv').config();
const AssistantV2 = require('ibm-watson/assistant/v2');
const { IamAuthenticator } = require('ibm-watson/auth');
const clientTwilio = require('twilio')(process.env.accountSid, process.env.authToken);
const express = require('express');
const bodyParser  = require('body-parser');

var cookieParser = require('cookie-parser');

// Constants
const port = process.env.PORT || 8080;
   
// App
const app = express();
app.use(bodyParser.urlencoded({
   extended: true
}));
app.use(bodyParser.json());
app.use(cookieParser());

/* Se instancia el asistente utilizando como autentificador una instancia de IamAuthenticator
pasando como parámetro el api key contenido en el archivo .env */
const assistant = new AssistantV2({
    authenticator: new IamAuthenticator({ apikey: process.env.WATSON_API }),
    url: process.env.URL,
    version: '2020-04-01'
});

/* Función para crear la sesión inicial.
La sesión es importante para que el chatbot sepa distinguir entre distintas conversaciones y usuarios
y de esta manera mantener el contexto del flujo de la conversación */

var sessionId; // Se declara la variable en la que se guardará la sesión

/* La clase AssistantV2 tiene una funciónla cual crea la sesión
DOCUMENTACIÓN: https://cloud.ibm.com/apidocs/assistant/assistant-v2?code=node#create-a-session */
assistant.createSession(
    {
        assistantId: process.env.ASSISTANT_ID || '{assistant_id}',
    },
    function (error, response) {
        if (error) {
            console.log(error);
        } else {
            sessionId = response.result.session_id
            console.log(response.result.session_id);
        }
    }
);

app.post('/api', function (body, req) {
    return new Promise((resolve, reject) => {
        //console.log(body);
        assistant.message(
        {
            input: { text: req.req.body.Body },
            assistantId: process.env.ASSISTANT_ID,
            sessionId: sessionId
        })
        .then(response => {
            //console.log(req.req.body.Body);
            clientTwilio.messages
            .create({
                body: response.result.output.generic[0].text,
                from: process.env.NUMBER,
                to: body.body.From
            })
            //console.log(JSON.stringify(response.result, null, 2));
            resolve(response.result.output.generic[0].text)
        })
        .catch(err => {
            console.log(err);
            reject(err)
        });
    });
});

//Server listening on port 8080
var server = app.listen(port, function () {
   console.log('Server running at http://127.0.0.1:' + port + '/');
});