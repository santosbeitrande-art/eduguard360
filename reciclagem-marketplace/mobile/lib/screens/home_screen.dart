import 'package:flutter/material.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Reciclagem Marketplace'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text(
              'Bem-vindo ao app de reciclagem',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 16),
            Text(
              'Este projeto é independente do eduguard360 e não possui nenhuma conexão com ele.',
            ),
            SizedBox(height: 24),
            Text(
              'Funcionalidades iniciais:',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 12),
            Text('• Listar anúncios de reciclagem'),
            Text('• Visualizar detalhes de coleta'),
            Text('• Plataforma limpa e independente'),
          ],
        ),
      ),
    );
  }
}
