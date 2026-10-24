
/*-----------------------------------------------------------------------------------------------------------------
  MesaAyuda.js debe copiarse al directorio del proyecto express como index.js

  REST API 
  UADER - IS1
  Caso de estudio MesaAyuda

  Dr. Pedro E. Colla 2023,2025
 *----------------------------------------------------------------------------------------------------------------*/
//AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE=1

import express from 'express';
import crypto from 'crypto';
console.log("Comenzando servidor");

// const crypto = require('crypto');
console.log("crypto Ok!");

//const express = require('express');
//console.log("express Ok!");

const app = express();
console.log("express ready!");

const PORT = 8080;

import cors from 'cors';

//const cors = require('cors');
console.log("cors ok!");

app.use(cors());
console.log("cors ready!");

import AWS from 'aws-sdk'
//var AWS = require('aws-sdk');
console.log("aws-sdk ready!");

/*----
Acquire critical security resources from an external file out of the path
*/
//const accessKeyId = require('../accessKeyId.js');
//const secretAccessKey = require('../secretAccessKey.js');
import accessKeyId from '../accessKeyId.js';
import secretAccessKey  from '../secretAccessKey.js';

let awsConfig = {
    "region"         : "us-east-1",
    "endpoint"       : "http://dynamodb.us-east-1.amazonaws.com",
    "accessKeyId"    : accessKeyId, 
    "secretAccessKey": secretAccessKey
};

AWS.config.update(awsConfig);
console.log("Servidor listo!");
let docClient = new AWS.DynamoDB.DocumentClient();

app.listen(
    PORT,
    () => console.log(`Servidor listo en http://localhost:${PORT}`)
);

app.use(express.json());

app.get('/api/cliente', (req,res) => {
    res.status(200).send({response : "OK", message : "API Ready"});
    console.log("API cliente: OK");
});

/*-----------
función para hacer el parse de un archivo JSON
*/
function jsonParser(keyValue,stringValue) {
    var string = JSON.stringify(stringValue);
    var objectValue = JSON.parse(string);
    return objectValue[keyValue];
}
/*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*
/*                                                       API REST Cliente                                                            *
/*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*


/*-----------
  /api/getCliente
  Esta API permite acceder a un cliente dado su id
*/
app.post('/api/getCliente/:id', (req,res) => {
    const { id } = req.params;
    console.log("getCliente: id("+id+")");
    var params = {
        TableName: "cliente",
        Key: {
            "id" : id
            //test use "id": "0533a95d-7eef-4c6b-b753-1a41c9d1fbd0"   
             }
        };
    docClient.get(params, function (err, data) {
        if (err)  {
            res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+ null}));
        } else {

            if (Object.keys(data).length != 0) {
               res.status(200).send(JSON.stringify({"response":"OK","cliente" : data.Item}),null,2);
            } else {
               res.status(400).send(JSON.stringify({"response":"ERROR",message : "Cliente no existe"}),null,2);
            }
        }    
    })


} );

/*---
  /api/loginCliente
  Esta API permite acceder a un cliente por ID y comparar la password pasada en un JSON en el cuerpo con la indicada en el DB
*/  
// PUNTO 1: antes se buscaba por ID con docClient.get() (clave primaria). Ahora llega el correo,
// que está en el campo "contacto" y NO es clave primaria, así que get() no sirve: se usa scan() con filtro.
app.post('/api/loginCliente', (req,res) => {

    const { contacto } = req.body;   // antes: const { id } = req.body;
    const { password } = req.body;

    console.log("loginCliente: mail("+contacto+")");

    if (!password) {
        res.status(400).send({response : "ERROR" , message : "Password no informada"});
        return;
    }
    if (!contacto) {
        res.status(400).send({response : "ERROR" , message : "email no informado"});
        return;
    }

    let getClienteByEmail = function () {
        var params = {
            TableName: "cliente",
            FilterExpression: "contacto = :c",        // equivale a WHERE contacto = ?
            ExpressionAttributeValues: { ":c": contacto }  // valor real que reemplaza al placeholder :c
        };
        // scan recorre la tabla y devuelve data.Items: un ARRAY con los registros que cumplen el filtro
        docClient.scan(params, function (err, data) {
            if (err) {
                res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+err}));
            } else {
                // Si Items está vacío, ningún cliente tiene ese correo. No sirve preguntar por
                // Object.keys(data): data siempre trae Items, Count y ScannedCount, y el servidor se cae.
                if (data.Items.length == 0) {
                    res.status(400).send({response : "ERROR" , message : "Cliente invalido"});
                } else {
                    // Items[0]: se asume correo único, entonces el primer registro es el cliente
                    const paswd=jsonParser('password',data.Items[0]);
                    const activo=jsonParser('activo',data.Items[0]);
                    const id=jsonParser('id',data.Items[0]);
                    const contacto=jsonParser('contacto',data.Items[0]);
                    // PUNTO 2: la password se compara ACÁ, en el servidor. Nunca se incluye en ninguna respuesta:
// al navegador solo vuelve la bandera "response". Hay dos casos que le importan al login:
// "OK" si coincide y "invalido" si no (el valor "invalido" lo pide la consigna).
                    if (password == paswd) {
                        if (activo == true) {
                            const nombre=jsonParser('nombre',data.Items[0]);
                            const fecha_ultimo_ingreso=jsonParser('fecha_ultimo_ingreso',data.Items[0]);
                            // Se devuelve el "id" (UUID real) además del correo: listarTicket lo necesita
                            res.status(200).send(JSON.stringify({response : "OK", "id" : id, "nombre" : nombre, "contacto" : contacto, "fecha_ultimo_ingreso": fecha_ultimo_ingreso}));
                        } else {
                            res.status(400).send(JSON.stringify({response : "ERROR", message : "Cliente no activo"}));
                        }
                    } else {
                        res.status(400).send(JSON.stringify({response : "invalido" , message : "usuario invalido"}));
                    }
                }
            }
        })
    }
    getClienteByEmail();

});

/*---------
Función para realizar el SCAN de un DB de cliente usando contacto como clave para la búsqueda (no es clave formal del DB)
*/
async function scanDb(contacto) {
    var docClient = new AWS.DynamoDB.DocumentClient();
    const scanKey=contacto;
    const paramsScan = { // ScanInput
      TableName: "cliente", // required
      Select: "ALL_ATTRIBUTES" || "ALL_PROJECTED_ATTRIBUTES" || "SPECIFIC_ATTRIBUTES" || "COUNT",
      // PUNTO 3: la función de pedro filtraba por "id" en vez de "contacto", entonces nunca encontraba
// un cliente por su correo. Se corrige para buscar por el campo "contacto".
      FilterExpression : 'contacto = :contacto',
      ExpressionAttributeValues : {':contacto' : scanKey}
    };      
    var objectPromise = await docClient.scan(paramsScan).promise().then((data) => {
          return data.Items 
    });  
    return objectPromise;
}

/*----
addCliente
Revisa si el contacto (e-mail) existe y en caso que no da de alta el cliente generando un id al azar
*/
app.post('/api/addCliente', (req,res) => {

    const {contacto} = req.body;
    const {password} = req.body;
    const {nombre}   = req.body;
    //Punto 3
    // Los T&C son obligatorios: el navegador manda "on" si el checkbox está tildado
    const{termscondition}= req.body;
    console.log("addCliente: contacto("+contacto+") nombre("+nombre+")");
    
    if (!password) {
        res.status(400).send({response : "ERROR" , message: "Password no informada"});
        return;
    }
    if (!nombre) {
        res.status(400).send({response : "ERROR", message : "Nombre no informado"});
        return;
    }

    if (!contacto){
        res.status(400).send({response : "ERROR" , message : "Contacto no informado"});
        return;
    } 
    //PUNTO 3
    // Validación en el servidor. El "return" es clave: sin él la función sigue de largo,
    // da de alta al cliente igual y después se cae al intentar responder dos veces.
    if (termscondition != 'on'){
        res.status(400).send({response: "ERROR", message: "Terminos y condiciones no aceptadas"});
        return;
    }

    scanDb(contacto)
    .then(resultDb => {
      if (Object.keys(resultDb).length != 0) {
        res.status(400).send({response : "ERROR" , message : "Cliente ya existe"});
        return;
      } else {
        const newID = crypto.randomUUID();// PUNTO 3: declaramos newid
        var hoy = new Date();
        var dd = String(hoy.getDate()).padStart(2, '0');
        var mm = String(hoy.getMonth() + 1).padStart(2, '0'); //January is 0!
        var yyyy = hoy.getFullYear();
        hoy = dd + '/' + mm + '/' + yyyy;
    
        const newCliente = {
         id                    : newID, // antes: id: contacto
         contacto              : contacto, // el email ahora se guarda como atributo aparte
         nombre                : nombre,
         password              : password,
         activo                : true,
         registrado            : true,
         primer_ingreso        : false,
         fecha_alta            : hoy,
         fecha_cambio_password : hoy,
         fecha_ultimo_ingreso  : hoy,
        };
    
        const paramsPut = {
          TableName: "cliente",
          Item: newCliente,
          ConditionExpression:'attribute_not_exists(id)',
        };

        docClient.put(paramsPut, function (err, data) {
            if (err) {
                res.status(400).send(JSON.stringify({response : "ERROR", message : "DB error" + err}));
            } else {
                res.status(200).send(JSON.stringify({response : "OK", message : "Cliente registrado"}));
            }
        });
    }
    });

});
// PUNTO 3: informa si un correo ya está registrado. Lo usa el login para habilitar o deshabilitar "Registrate".
// Siempre responde 200: "existe" y "no existe" son respuestas válidas, no errores.
// Ojo: permite probar correos sin autenticarse (enumeración de usuarios). La consigna admite esa debilidad.
app.post('/api/existeCliente', (req, res) => {

    const { contacto } = req.body;

    if (!contacto) {
        res.status(400).send({ response: "ERROR", message: "Contacto no informado" });
        return;
    }

    scanDb(contacto)
    .then(resultDb => {
        if (Object.keys(resultDb).length != 0) {
            res.status(200).send({ response: "OK", existe: true });
        } else {
            res.status(200).send({ response: "OK", existe: false });
        }
    });

});
/*----------
/api/updateCliente
Permite actualizar datos del cliente contacto, nombre, estado de activo y registrado
*/
app.post('/api/updateCliente', (req,res) => {
    
    const {id} = req.body;
    const {nombre}   = req.body; 
    const {password} = req.body;

    var activo = ((req.body.activo+'').toLowerCase() === 'true')
    var registrado = ((req.body.registrado+'').toLowerCase() === 'true')

    console.log("updateCliente: id("+id+") nombre("+nombre+") activo("+activo+") registrado("+registrado+")");

    if (!id) {
        res.status(400).send({response : "ERROR" , message: "Id no informada"});
        return;
    }

    if (!nombre) {
        res.status(400).send({response : "ERROR" , message: "Nombre no informado"});
        return;
    }

    if (!password) {
        res.status(400).send({response : "ERROR" , message: "Password no informado"});
        return;
    }

    var params = {
        TableName: "cliente",
        Key: {
            "id" : id
            //test use "id": "0533a95d-7eef-4c6b-b753-1a41c9d1fbd0"   
             }
        };
        
    docClient.get(params, function (err, data) {
        if (err)  {
            res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+ null}));
            return;
        } else {

            if (Object.keys(data).length == 0) {
                res.status(400).send(JSON.stringify({"response":"ERROR",message : "Cliente no existe"}),null,2);
                return;
            } else {

                const paramsUpdate = { 
   
                    ExpressionAttributeNames: { 
                         "#a": "activo", 
                         "#n": "nombre",
                         "#p": "password",
                         "#r": "registrado"

                    }, 
                    ExpressionAttributeValues: { 
                        ":a": activo , 
                        ":p": password,
                        ":n": nombre , 
                        ":r": registrado 
                   }, 
                   Key: { 
                       "id": id 
                   }, 
                   ReturnValues: "ALL_NEW", 
                   TableName: "cliente", 
                   UpdateExpression: "SET #n = :n, #p = :p, #a = :a, #r = :r" 
                };
                docClient.update(paramsUpdate, function (err, data) {
                    if (err)  {
                        res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+err}));
                        return;
                    } else {
                        res.status(200).send(JSON.stringify({response : "OK", message : "updated" , "data": data}));
                    }    
                });    
            }
        }    
    })


});
/*-------
/api/resetCliente
Permite cambiar la password de un cliente, identificado por su correo electrónico (contacto)
*/
// PUNTO 5: antes esta función recibía el "id" del cliente y devolvía el registro completo (con la password).
// Ahora recibe el correo ("contacto"), que es lo único que el usuario conoce, y no devuelve datos del cliente.
app.post('/api/resetCliente', (req,res) => {

    // req.body es el JSON que envía resetPassword.js; acá se leen los dos datos que llegan
    const {contacto} = req.body;
    const {password} = req.body;

    // Si falta alguno de los dos datos se responde error 400 y "return" corta la función
    if (!contacto) {
        res.status(400).send({response : "ERROR" , message: "Contacto no informado"});
        return;
    }

    if (!password) {
        res.status(400).send({response : "ERROR" , message: "Password no informada"});
        return;
    }

    // scanDb recorre la tabla "cliente" y devuelve una LISTA con los registros cuyo contacto coincide.
    // El ".then" se ejecuta cuando la base de datos terminó de responder.
    scanDb(contacto)
    .then(resultDb => {
        // Lista vacía = no hay ningún cliente con ese correo
        if (Object.keys(resultDb).length == 0) {
            res.status(400).send({response : "ERROR" , message : "Cliente no existe"});
            return;
        }

        // "update" necesita la clave primaria (id), no el correo: se toma del primer registro encontrado
        const id = resultDb[0].id;

        const paramsUpdate = {
            // "#p" es un alias del nombre del atributo (los alias evitan conflictos con palabras reservadas de DynamoDB)
            ExpressionAttributeNames: {
                "#p": "password"
            },
            // ":p" es un marcador que se reemplaza por la nueva password
            ExpressionAttributeValues: {
                ":p": password
            },
            // Key indica qué registro se modifica
            Key: {
                "id": id
            },
            TableName: "cliente",
            // SET cambia el valor de un atributo: solo se toca la password, el resto del registro queda igual.
            // Se quitó ReturnValues: "ALL_NEW", que hacía devolver el registro completo (con la password).
            UpdateExpression: "SET #p = :p"
        };

        // Ejecuta el cambio. La función se llama cuando DynamoDB responde (err = error, data = resultado)
        docClient.update(paramsUpdate, function (err, data) {
            if (err) {
                res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+err}));
            } else {
                res.status(200).send(JSON.stringify({response : "OK", message : "Password actualizada"}));
            }
        });
    });
});
/*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*
/*                                                       API REST ticket                                                             *
/*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*/

/*---------
Función para realizar el SCAN de un DB de cliente usando contacto como clave para la búsqueda (no es clave formal del DB)
*/
async function scanDbTicket(clienteID) {
    var docClient = new AWS.DynamoDB.DocumentClient();
    const scanKey=clienteID;
    const paramsScan = { // ScanInput
      TableName: "ticket", // required
      Select: "ALL_ATTRIBUTES" || "ALL_PROJECTED_ATTRIBUTES" || "SPECIFIC_ATTRIBUTES" || "COUNT",
      FilterExpression : 'clienteID = :clienteID',
      ExpressionAttributeValues : {':clienteID' : scanKey}
    };      
    var objectPromise = await docClient.scan(paramsScan).promise().then((data) => {
          return data.Items 
    });  
    return objectPromise;
}
/*----------
  listarTicket
  API REST para obtener todos los tickets de un clienteID
*/  
app.post('/api/listarTicket', (req,res) => {
// PUNTO 1: el diagrama de secuencia define el mensaje como listarTicket{ID}, y listarTicket.js ya manda "ID".
// El servidor esperaba "clienteID", por eso respondía 400. Se renombra en los 4 lugares donde se usa.
    const {ID}  = req.body;
    console.log("listarTicket: clienteID("+ID+")");
 
    if (!ID) {
        res.status(400).send({response : "ERROR" , message: "clienteID no informada"});
        return;
    }

    scanDbTicket(ID)
    .then(resultDb => {
      if (Object.keys(resultDb).length == 0) {
        res.status(400).send({response : "ERROR" , message : "clienteID no tiene tickets"});
        return;
      } else {
        res.status(200).send(JSON.stringify({response : "OK",  "data": resultDb}));
    }

    });

});

/*---------
  getTicket
  API REST para obtener los detalles de un ticket
*/
app.post('/api/getTicket', (req,res) => {
    const {id}  = req.body;
    console.log("getTicket: id("+id+")");
 
    if (!id) {
        res.status(400).send({response : "ERROR" , message: "ticket id no informada"});
        return;
    }
    var params = {
        TableName: "ticket",
        Key: {
            "id" : id
            //"clienteID": "0533a95d-7eef-4c6b-b753-1a41c9d1fbd0"   
            //"id"       : "e08905a8-4aab-45bf-9948-4ba2b8602ced"
        }
    };
    docClient.get(params, function (err, data) {
        if (err) {
            res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+err}));
        }
        else {
            if (Object.keys(data).length == 0) {
                res.status(400).send({response : "ERROR" , message : "ticket invalido"});
            } else {
                res.status(200).send(JSON.stringify({response : "OK", "data" : data}));    
            }    
        }
    })
});

/*-----------------
/api/addTicket
API REST para agregar ticket (genera id)
*/
app.post('/api/addTicket', (req,res) => {

    const {clienteID} = req.body;
    const estado_solucion = 1;
    const {solucion} = req.body;
    const {descripcion} = req.body;

    var hoy = new Date();
    var dd = String(hoy.getDate()).padStart(2, '0');
    var mm = String(hoy.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = hoy.getFullYear();
    hoy = dd + '/' + mm + '/' + yyyy;

    const newTicket = {
     id                    : crypto.randomUUID(),
     clienteID             : clienteID,
     estado_solucion       : estado_solucion,
     solucion              : solucion,
     descripcion           : descripcion,
     fecha_apertura        : hoy,
     ultimo_contacto       : hoy
    };

    const paramsPut = {
      TableName: "ticket",
      Item: newTicket,
      ConditionExpression:'attribute_not_exists(id)',
    };

    docClient.put(paramsPut, function (err, data) {
        if (err) {
            res.status(400).send(JSON.stringify({response : "ERROR", message : "DB error" + err}));
        } else {
            res.status(200).send(JSON.stringify({response : "OK", "ticket": newTicket}));
        }
    });
}
)

/*--------
/api/updateTicket
Dado un id actualiza el ticket, debe informarse la totalidad del ticket excepto ultimo_contacto
*/
app.post('/api/updateTicket', (req,res) => {

    const {id} = req.body;
    const {clienteID} = req.body;
    const {estado_solucion} = req.body;
    const {solucion} = req.body;
    const {descripcion} = req.body;
    const {fecha_apertura} = req.body;

    if (!id) {
        res.status(400).send({response : "ERROR" , message: "Id no informada"});
        return;
    }

    if (!clienteID) {
        res.status(400).send({response : "ERROR" , message: "clienteID no informada"});
        return;
    }

    if (!estado_solucion) {
        res.status(400).send({response : "ERROR" , message: "estado_solucion no informada"});
        return;
    }

    if (!solucion) {
        res.status(400).send({response : "ERROR" , message: "solucion no informado"});
        return;
    }

    if (!fecha_apertura) {
        res.status(400).send({response : "ERROR" , message: "fecha apertura"});
        return;
    }
    
    var hoy = new Date();
    var dd = String(hoy.getDate()).padStart(2, '0');
    var mm = String(hoy.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = hoy.getFullYear();
    hoy = dd + '/' + mm + '/' + yyyy;

    const ultimo_contacto = hoy;

    var params = {
        TableName: "ticket",
        Key: {
            "id" : id
            //test use "id": "0533a95d-7eef-4c6b-b753-1a41c9d1fbd0"   
             }
        };
        
    docClient.get(params, function (err, data) {
        if (err)  {
            res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+ null}));
            return;
        } else {

            if (Object.keys(data).length == 0) {
                res.status(400).send(JSON.stringify({"response":"ERROR",message : "ticket no existe"}),null,2);
                return;
            } else {

                const paramsUpdate = { 
   
                    ExpressionAttributeNames: { 
                         "#c": "clienteID", 
                         "#e": "estado_solucion",
                         "#s": "solucion",
                         "#a": "fecha_apertura",
                         "#u": "ultimo_contacto",
                         "#d": "descripcion"
                    }, 
                    ExpressionAttributeValues: { 
                        ":c":  clienteID, 
                        ":e":  estado_solucion , 
                        ":s":  solucion , 
                        ":a":  fecha_apertura,
                        ":u":  ultimo_contacto,
                        ":d":  descripcion 
                   }, 
                   Key: { 
                       "id": id 
                   }, 
                   ReturnValues: "ALL_NEW", 
                   TableName: "ticket", 
                   UpdateExpression: "SET #c = :c, #e = :e, #a = :a, #s = :s, #d = :d, #u = :u" 
                };
                docClient.update(paramsUpdate, function (err, data) {
                    if (err)  {
                        res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+err}));
                        return;
                    } else {
                        res.status(200).send(JSON.stringify({response : "OK",  "data": data}));
                    }    
                });    
            }
        }    
    })

});

/*---------
Función para realizar el SCAN completo (sin filtro) de una tabla
*/
// PUNTO 6: igual que scanDb y scanDbTicket, pero sin FilterExpression: devuelve TODOS los registros de la tabla.
// "tabla" es el nombre de la tabla a leer ("cliente" o "ticket").
async function scanDbTabla(tabla) {
    var docClient = new AWS.DynamoDB.DocumentClient();
    const paramsScan = {
      TableName: tabla
    };
    // "await" espera a que DynamoDB responda antes de seguir; data.Items es la lista de registros
    var objectPromise = await docClient.scan(paramsScan).promise().then((data) => {
          return data.Items
    });
    return objectPromise;
}

/*---------
resumenTickets
Función común para GET y POST: valida usuario y password y devuelve la cantidad de tickets de cada cliente
*/
// PUNTO 6: la lógica está en una sola función que usan las dos rutas (GET y POST), así dan el mismo resultado.
// "async" permite usar "await" adentro: el código se lee de arriba hacia abajo, esperando cada consulta.
async function resumenTickets(ID, password, res) {

    // Si falta algún dato se responde error 400 y "return" corta la función
    if (!ID) {
        res.status(400).send({response : "ERROR" , message : "ID no informado"});
        return;
    }
    if (!password) {
        res.status(400).send({response : "ERROR" , message : "Password no informada"});
        return;
    }

    // Valida el usuario: el "usuario" es el correo. scanDb devuelve una lista con los clientes que tienen ese correo.
    // Error si la lista está vacía (correo inexistente) o la password no coincide. Se usa un solo mensaje
    // para no revelar cuál de las dos cosas falló.
    const usuario = await scanDb(ID);
    if (usuario.length == 0 || usuario[0].password != password) {
        res.status(400).send({response : "ERROR" , message : "Usuario o password invalido"});
        return;
    }

    // Lee todos los clientes y todos los tickets de la base de datos
    const clientes = await scanDbTabla("cliente");
    const tickets  = await scanDbTabla("ticket");

    // "resumen" es la lista que se va a devolver: un elemento por cada cliente
    const resumen = [];
    // forEach recorre la lista de clientes de a uno ("c" es el cliente actual)
    clientes.forEach((c) => {
        // filter arma una lista nueva con los tickets cuyo clienteID coincide con el id de este cliente
        const susTickets = tickets.filter((t) => t.clienteID == c.id);
        // push agrega el resultado de este cliente a la lista
        resumen.push({
            id               : c.id,
            contacto         : c.contacto,
            cantidad_tickets : susTickets.length,   // la cantidad es el largo de la lista (puede ser 0)
            // map arma otra lista transformando cada ticket: queda solo con los tres datos pedidos
            tickets          : susTickets.map((t) => ({
                id              : t.id,
                fecha_apertura  : t.fecha_apertura,
                estado_solucion : t.estado_solucion
            }))
        });
    });

    // JSON.stringify convierte el resultado en texto JSON para enviarlo. No incluye ninguna password.
    res.status(200).send(JSON.stringify({response : "OK", "clientes" : resumen}));
}

/*---
  /resumenTickets  (GET)
  Los argumentos llegan en el URL: /resumenTickets?ID={usuario}&PASSWORD={password}
*/
// PUNTO 6: en GET los datos viajan en el URL y Express los deja en req.query.
// Los nombres ID y PASSWORD (en mayúscula) son los de la consigna: JavaScript distingue mayúsculas de minúsculas.
app.get('/resumenTickets', (req,res) => {
    const ID       = req.query.ID;
    const password = req.query.PASSWORD;
    console.log("resumenTickets GET: ID("+ID+")");
    resumenTickets(ID, password, res);
});

/*---
  /resumenTickets  (POST)
  Los argumentos llegan en un JSON: {"ID": "...", "PASSWORD": "..."}
*/
// PUNTO 6: en POST los datos viajan en el cuerpo del pedido, en JSON, y Express los deja en req.body.
app.post('/resumenTickets', (req,res) => {
    const ID       = req.body.ID;
    const password = req.body.PASSWORD;
    console.log("resumenTickets POST: ID("+ID+")");
    resumenTickets(ID, password, res);
});

/*---------
consultarTicket
Función común para GET y POST: valida usuario y password y devuelve los datos de un ticket
*/
// PUNTO 7: igual que el punto 6, una función común para GET y POST.
// No confundir con /api/getTicket (ya existía): esa busca el ticket sin pedir usuario ni password.
async function consultarTicket(ID, password, ticketID, res) {

    // Si falta algún dato se responde error 400 y "return" corta la función
    if (!ID) {
        res.status(400).send({response : "ERROR" , message : "ID no informado"});
        return;
    }
    if (!password) {
        res.status(400).send({response : "ERROR" , message : "Password no informada"});
        return;
    }
    if (!ticketID) {
        res.status(400).send({response : "ERROR" , message : "Ticket no informado"});
        return;
    }

    // Valida el usuario (correo) y la password ANTES de consultar el ticket, como pide la consigna:
    // si no son válidos, "return" corta la función y la búsqueda del ticket ni se ejecuta.
    const usuario = await scanDb(ID);
    if (usuario.length == 0 || usuario[0].password != password) {
        res.status(400).send({response : "ERROR" , message : "Usuario o password invalido"});
        return;
    }

    // Busca el ticket por su clave primaria (id). Acá se puede usar "get" (y no "scan") justamente por eso.
    const params = {
        TableName: "ticket",
        Key: { "id" : ticketID }
    };
    // ".promise()" permite usar "await" con docClient.get, que normalmente trabaja con una función de respuesta
    const data = await docClient.get(params).promise();

    // Si el ticket no existe, DynamoDB responde sin el atributo "Item"
    if (!data.Item) {
        res.status(400).send({response : "ERROR" , message : "Ticket no existe"});
        return;
    }

    // Respuesta: id y correo del cliente más el registro completo del ticket (data.Item)
    res.status(200).send(JSON.stringify({
        response : "OK",
        id       : usuario[0].id,
        contacto : usuario[0].contacto,
        ticket   : data.Item
    }));
}

/*---
  /getTicket  (GET)
  Los argumentos llegan en el URL: /getTicket?ID={usuario}&PASSWORD={password}&TICKET={ticketID}
*/
// PUNTO 7: GET toma los datos del URL (req.query).
app.get('/getTicket', (req,res) => {
    const ID       = req.query.ID;
    const password = req.query.PASSWORD;
    const ticketID = req.query.TICKET;
    console.log("getTicket GET: ID("+ID+") TICKET("+ticketID+")");
    consultarTicket(ID, password, ticketID, res);
});

/*---
  /getTicket  (POST)
  Los argumentos llegan en un JSON: {"ID": "...", "PASSWORD": "...", "TICKET": "..."}
*/
// PUNTO 7: POST toma los datos del cuerpo del pedido (req.body).
app.post('/getTicket', (req,res) => {
    const ID       = req.body.ID;
    const password = req.body.PASSWORD;
    const ticketID = req.body.TICKET;
    console.log("getTicket POST: ID("+ID+") TICKET("+ticketID+")");
    consultarTicket(ID, password, ticketID, res);
});
/*-------------------------------------------------[ Fin del API REST ]-------------------------------------------------------------*/
