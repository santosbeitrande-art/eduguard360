import 'package:flutter/material.dart';
import 'screens/login_screen.dart';

void main() {
  runApp(const ReciclagemApp());
}

class ReciclagemApp extends StatelessWidget {
  const ReciclagemApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Reciclagem Marketplace',
      theme: ThemeData(
        primarySwatch: Colors.green,
        useMaterial3: true,
      ),
      home: const LoginScreen(),
    );
  }
}
