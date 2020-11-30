
// Servidor integrador de IBM Watson a Whatsapp utilizando Twilio.
// Por: Mauricio Nañez Pro

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
pasando como parámetro el api key contenido en el archivo .env junto con el url y la versión 
obtenidos de la página de Watson.*/

/* La clase AssistantV2 tiene una funciónla cual crea la sesión
DOCUMENTACIÓN: https://cloud.ibm.com/apidocs/assistant/assistant-v2?code=node#create-a-session */
const assistant = new AssistantV2({
    authenticator: new IamAuthenticator({ apikey: process.env.WATSON_API }),
    url: process.env.URL,
    version: '2020-04-01'
});

var sessionId; // Se declara la variable en la que se guardará la sesión

/* Función para crear la sesión inicial.
La sesión es importante para que el chatbot sepa distinguir entre distintas conversaciones y usuarios
y de esta manera mantener el contexto del flujo de la conversación */
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

/* Función para que, si el servidor recibe un post, Watson mande el mensaje al bot y regrese la(s) 
contestación(es). Esta(s) contestación(es) la(s) envía a Twilio mediante la función "create" para
que Whatsapp pueda desplegar la(s) contestación(es) en forma de mensaje(s).*/
app.post('/api', function (body, req) {
    return new Promise((resolve, reject) => {
        assistant.message(
        {
            input: { text: req.req.body.Body },
            assistantId: process.env.ASSISTANT_ID,
            sessionId: sessionId
        })
        .then(response => {
            async function loop () {
                for (let index = 0; index < response.result.output.generic.length; index++) {
                    const a = await clientTwilio.messages
                        .create({
                            body: response.result.output.generic[index].text,
                            from: process.env.NUMBER,
                            to: body.body.From
                        });

                    const r = await resolve(response.result.output.generic[index].text);
                }
            }
            loop();
        })
        .catch(err => {
            console.log(err);
            reject(err);
        });
    });
});

// Función para el servidor. Reemplazar el puerto cuando se vaya a hostear.
var server = app.listen(port, function () {
   console.log('Server running at http://127.0.0.1:' + port + '/');
});