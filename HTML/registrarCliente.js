// PUNTO 3: lógica de la pantalla de registración (corre en el navegador)
const formE1 = document.querySelector('.form');

formE1.addEventListener('submit', (event) => {
	event.preventDefault();   // evita que el formulario recargue la página
	const formData = new FormData(formE1);
	const data = Object.fromEntries(formData);   // data.contacto, data.nombre, data.password, data.termscondition
	document.getElementById('resultado1').textContent = '';
	document.getElementById('resultado2').textContent = '';
	
	// Validación de comodidad: los 3 campos de texto no pueden estar vacíos
	if (data.contacto == '' || data.password == '' || data.password2 == '' || data.nombre == '') {
		document.getElementById('resultado1').style.color = 'RED';
		document.getElementById('resultado1').style.textAlign = 'center';
		document.getElementById('resultado1').textContent =
			'Debe informar nombre, correo y la password dos veces para completar el registro';
		return;
	}

	// Las dos passwords deben ser iguales (se verifica solo en el navegador: al servidor llega una sola)
	if (data.password != data.password2) {
		document.getElementById('resultado1').style.color = 'RED';
		document.getElementById('resultado1').style.textAlign = 'center';
		document.getElementById('resultado1').textContent = 'Las passwords no coinciden';
		return;

	}
	// Los T&C son obligatorios según la consigna
	if (data.termscondition != 'on') {
		document.getElementById('resultado2').style.textAlign = 'center';
		document.getElementById('resultado2').style.color = 'RED';
		document.getElementById('resultado2').textContent =
			'Debe aceptar los T&C para poder registrarse';
		return;
	}

	const systemURL = { loginCliente: 'http://127.0.0.1:5500/HTML/loginClient.html' };
	// Sin bloque MODE: el TP solo modifica el modo LOCAL
	const RESTAPI = { addCliente: 'http://localhost:8080/api/addCliente' };

	// Estas 4 claves son las que lee addCliente en req.body
	const nuevoCliente = {
		contacto: data.contacto,
		nombre: data.nombre,
		password: data.password,
		termscondition: data.termscondition,
	};

	const options = {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(nuevoCliente),
	};

	fetch(RESTAPI.addCliente, options)
		.then((res) => res.json())
		.then((result) => {
			if (result.response == 'OK') {
				// La consigna pide volver a la pantalla de login si el alta fue exitosa
				window.location.href = systemURL.loginCliente;
			} else {
				document.getElementById('resultado1').style.color = 'RED';
				document.getElementById('resultado1').textContent =
					'Error de registro: ' + result.message;
			}
		});
});