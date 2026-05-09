import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/user.dart';
import '../models/listing.dart';

class ApiService {
  static const baseUrl = 'http://localhost:4000/api';

  static Future<User> login(String phone) async {
    final response = await http.post(
      Uri.parse('$baseUrl/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'phone': phone}),
    );

    if (response.statusCode == 200) {
      return User.fromJson(jsonDecode(response.body)['data']);
    }

    throw Exception('Falha no login');
  }

  static Future<List<Listing>> getListings() async {
    final response = await http.get(Uri.parse('$baseUrl/listings'));
    if (response.statusCode == 200) {
      final results = jsonDecode(response.body)['data'] as List;
      return results.map((item) => Listing.fromJson(item)).toList();
    }
    throw Exception('Não foi possível carregar anúncios');
  }
}
