var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var redis = require('redis');

var app = express();

// Cria Cliente Redis
// Porta e hostname são retirados de configuration -> endpoint do redislabs.com
var clienteRedis = redis.createClient(13873, 
	'redis-13873.c13.us-east-1-3.ec2.cloud.redislabs.com', 
	{no_ready_check: true});

clienteRedis.auth('password', function(err){
	if (err) throw err;
});

clienteRedis.on('connect', function () {
    console.log('Servidor Redis Conectado ...');
});

// Configuração do Renderizador de Páginas (EJS)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Captura o caminho '/' na URL
app.get('/', function (req, res) {
    var titulo = 'Lista de Tarefas';

    clienteRedis.lrange('tarefas', 0, -1, function (err, tarefas) {
		clienteRedis.hgetall('contato', function(err, contato){
			res.render('tarefas', {
				titulo: titulo,
				tarefas: tarefas,
				contato: contato
			});
		});
    });
});

app.post('/tarefa/adicionar', function(req, res){
	var tarefa = req.body.tarefa;

	clienteRedis.rpush('tarefas', tarefa, function(err, reply){
		if(err){
			console.log(err);
		}
		console.log('Tarefa Adicionada ...');
		res.redirect('/');
	});
});

app.post('/tarefa/remover', function(req, res){
	var tarefasParaRemover = req.body.tarefas;

	clienteRedis.lrange('tarefas', 0, -1, function(err, tarefas){
		for(var posicao = 0; posicao < tarefas.length; posicao++){
			if(tarefasParaRemover.indexOf(tarefas[posicao]) > -1){
				clienteRedis.lrem('tarefas',0,tarefas[posicao], function(){
					if(err){
						console.log(err);
					}
				});
			}
		}
		res.redirect('/');
	});
});

app.post('/contato/editar', function(req, res){
	var contato = {};

	contato.nome = req.body.nome;
	contato.companhia = req.body.companhia;
	contato.telefone = req.body.telefone;

	clienteRedis.hmset('contato', 
	         ['nome', contato.nome,
			  'companhia', contato.companhia, 
			  'telefone', contato.telefone], 
			  function(err, reply){
		if(err){
			console.log(err);
		}
		console.log(reply);
		res.redirect('/');
	});
});

app.listen(3000);
console.log('Servidor Inicializado na Porta 3000 ...',
    'URL: http://localhost:3000/');

module.exports = app;