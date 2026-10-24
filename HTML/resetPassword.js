// PUNTO 5: pantalla del link "¿Olvidaste tu contraseña?".
// Busca en la página (resetPassword.html) el formulario, para poder reaccionar cuando se envía
const formE1 = document.querySelector('.form');

// Esta función se ejecuta cuando el usuario aprieta el botón "Cambiar contraseña"
formE1.addEventListener('submit', (event) => {
	// Evita que el navegador envíe el formulario por su cuenta (recargaría la página): todo se maneja acá
	event.preventDefault();
	// Lee los campos del formulario. "data" queda con una propiedad por campo, según su atributo name:
	// data.contacto, data.password1 y data.password2
	const formData = new FormData(formE1);
	const data = Object.fromEntries(formData);

	// Lugar de la página donde se muestran los mensajes de error (se limpia antes de cada intento)
	const mensaje = document.getElementById('resultado1');
	mensaje.style.color = 'RED';
	mensaje.style.textAlign = 'center';
	mensaje.textContent = '';

	/*---
	    Validaciones en el formulario antes de llamar al servidor
	*/
	// Si falta algún dato no se molesta al servidor ("return" corta la función)
	if (data.contacto == '' || data.password1 == '' || data.password2 == '') {
		mensaje.textContent = 'Debe informar el correo y la nueva password dos veces';
		return;
	}

	// Verificación que pide la consigna: las dos passwords deben ser iguales. Se hace en el navegador.
	if (data.password1 != data.password2) {
		mensaje.textContent = 'Las passwords no coinciden';
		return;
	}

	/*---
	    Si coinciden, llama al API REST para actualizar la password
	*/
	// Los nombres de este objeto (contacto, password) tienen que ser los mismos que lee el servidor en req.body
	const reset = {
		contacto: data.contacto,
		password: data.password1,
	};

	// Configuración del pedido: método POST, el cuerpo viaja como JSON
	// (JSON.stringify convierte el objeto en texto JSON)
	const options = {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(reset),
	};

	// Acá se llama al servidor de aplicaciones (puerto 8080). fetch no espera la respuesta:
	// cada ".then" se ejecuta cuando la respuesta llega.
	fetch('http://localhost:8080/api/resetCliente', options)
		.then((res) => {
			// convierte el texto recibido en un objeto
			return res.json();
		})
		.then((resp) => {
			console.log('Respuesta del servidor: ' + JSON.stringify(resp));
			// El servidor responde "OK" si cambió la password; cualquier otro valor es un error
			if (resp.response == 'OK') {
				alert('Password actualizada. Ahora puede iniciar sesión.');
				window.location.href = 'loginClient.html';   // vuelve al login
			} else {
				mensaje.textContent = resp.message;   // muestra el motivo que informó el servidor
			}
		});
});