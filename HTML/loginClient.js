const formE1 = document.querySelector('.form');

/*---
    Intercepta el submit del formulario
    */

formE1.addEventListener('submit', (event) => {
	event.preventDefault();
	const formData = new FormData(formE1);
	const data = Object.fromEntries(formData);
	console.log('Application Server: Revisa el valor del form:');
	console.log(data);

	/*---
        Realiza validaciones en los datos del formulario antes de procesar
        */

	if (data.contacto == '' || data.password == '') { // PUNTO 1: se valida "contacto" (el email) en vez de "id"
		console.log('debe indicar usuario');
		document.getElementById('resultado1').style.color = 'RED';
		document.getElementById('resultado1').style.textAlign = 'center';
		document.getElementById('resultado1').textContent =
			'Debe informar usuario y password para  completar el acceso';
		return;
	}

	if (data.id == 'pec') {   /*--Fix hecho por  Germán Lombardi IS1-2025 */
		console.log('pec no es bienvenido en éste sistema');
		const m = '<li>El usuario <pec> no es bienvenido en éste sistema</li>';
		document.getElementById('resultado2').style.color = 'RED';
		document.getElementById('resultado2').style.textAlign = 'center';
		document.getElementById('resultado2').textContent =
			'El usuario <pec> no es bienvenido en éste sistema';
		return;
	}
	if (data.termscondition != 'on') {
		console.log('no aceptó los T&C no se puede loggear');
		document.getElementById('resultado2').style.textAlign = 'center';
		document.getElementById('resultado2').style.color = 'RED';
		document.getElementById('resultado2').textContent =
			'Debe aceptar los T&C para poder usar el sistema';
		return;
	}

	/*---
        Genera objeto HTML a ser actualizado en el tag identificado como "app"
        */

	const HTMLResponse = document.querySelector('#app');
	const ul = document.createElement('ul');

	const tpl = document.createDocumentFragment();

	const systemURL = {
		listarTicket: 'http://127.0.0.1:5500/HTML/listarTicket.html',
		loginCliente: 'http://127.0.0.1:5500/HTML/loginClient.html',
	};

	const RESTAPI = {
		loginCliente: 'http://localhost:8080/api/loginCliente',
		listarTicket: 'http://localhost:8080/api/listarTicket',
	};

/*-----
    Define el URI para realizar el acceso en base al acceso a un servidor local
*/
    const MODE='LOCAL'; /*-- Instrucción a cambiar opciones LOCAL, TYPICODE o AWS --*/

	if (MODE == 'LOCAL') {
	/*-----
        Crea estructuras para acceder a data del cliente
        */
	    const login = {
			// PUNTO 1: el cuerpo del POST ahora lleva "contacto". La clave tiene que llamarse igual que
// la que lee el servidor en req.body; si solo cambiás el valor y dejás "id:", el servidor no lo recibe.
	        contacto: data.contacto,
		    password: data.password
		}	

		const options = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(login),
	};



	 	console.log('API REST:' + RESTAPI.loginCliente);
	    console.log(login);
	    console.log('login(' + JSON.stringify(login) + ')');
	    console.log('options ' + JSON.stringify(options));
    	var API = RESTAPI.loginCliente;
	    var APIoptions = options;

	};


	/*----------------------------------------------------------------------*/
	/*---- Typicode utilizar id 803a62c8-78c8-4b63-9106-73af216d504b -------*/
	/*                                                                      */
	/* El siguiente código es utilizado para resolver la validación de      */
	/* cliente utilizando un "fake" API REST server en Typicode             */
	/* para realizar la validación con el REST API server correcto          */
	/* deberá cambiar la instrucción para que                               */
	/*              const tipycode=false;                                   */
	/*----------------------------------------------------------------------*/


	if (MODE == 'TYPICODE') {
		console.log('Acceso usando Typicode como application server');
		API =
			'https://my-json-server.typicode.com/lu7did/MesaAyuda/posts/' + data.id;
		APIoptions = { method: 'GET' };
	}

	/*----------------------------------------------------------------------*/
	/*---- AWS Accede con URL de Lambda loginUserGET                 -------*/
	/*                                                                      */
	/* cliente: 803a62c8-78c8-4b63-9106-73af216d504b                        */
	/*                                                                      */
	/* Para activar el acceso mediante AWS hacer const aws=true;            */
	/*----------------------------------------------------------------------*/
	if (MODE == 'AWS') {
		console.log('Acceso usando AWS lambda como application server');
		API='https://fmtj0jrpp9.execute-api.us-east-1.amazonaws.com/default/loginUserGET?ID=' + data.id + '&PASSWORD=' + data.password;
    	APIoptions = { method: 'GET' };
	}
	/*-----
    Realiza el acceso al API Rest utilizando gestión de sincronización mediante promesas
	utiliza URL y options definidos en los pasos anteriores
    */

	fetch(`${API}`, APIoptions)
		.then((res) => {
			return res.json();
		})
		.then((users) => {
			console.log(
				'Datos en respuesta del application server=' + JSON.stringify(users)
			);
			// PUNTO 2: el navegador decide mirando solo "response". La password ya no viaja de vuelta,
// así que este log (que antes imprimía users.password) pasa a mostrar la bandera.
			console.log('users.response=' + users.response);
			if (users.response == 'OK') {
				//<==Habilitar esto para dejar que el API REST verifique sin exponer la password
				console.log('La password es correcta');
				console.log(
					'nombre(' +
						users.nombre +
						') fecha_ultimo_ingreso(' +
						users.fecha_ultimo_ingreso +
						')' +
						'mode(' + MODE + ')'
				);
				console.log(
					'id=' +
						users.id +
						' nombre=' +
						users.nombre +
						' ultimo=' +
						users.fecha_ultimo_ingreso
				);
				console.log(
					'changing to ' +
						systemURL.listarTicket +
						'?id=' +
						users.id +
						'&contacto=' +
						users.contacto +
						'&nombre=' +
						users.nombre +
						'&fecha_ultimo_ingreso=' +
						users.fecha_ultimo_ingreso +
						'&mode=' + MODE
				);
				window.location.href =
					systemURL.listarTicket +
					'?id=' +
					users.id +
					'&contacto=' +
					users.contacto +
					'&nombre=' +
					users.nombre +
					'&fecha_ultimo_ingreso=' +
					users.fecha_ultimo_ingreso +
					'&mode=' + MODE;
			} else if (users.response == 'invalido') {
				// PUNTO 2: el servidor avisa que la password no coincide con la guardada
				console.log('La password no es correcta');
				document.getElementById('resultado1').style.color = 'RED';
				document.getElementById('resultado1').textContent =
					'Error de login, intente nuevamente';
			} else {
				// cualquier otra respuesta: cliente inexistente o inactivo, error de la base
				console.log('Login rechazado: ' + users.message);
				document.getElementById('resultado1').style.color = 'RED';
				document.getElementById('resultado1').textContent =
					'Error de login, intente nuevamente';
			}
		});
});
