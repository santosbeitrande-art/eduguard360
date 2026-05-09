import 'package:http/http.dart' as http;
import 'dart:convert';
import '../models/user.dart';
import '../models/listing.dart';

class ApiService {
  static const String baseUrl = 'http://localhost:3000/api/v1';
  static String? _token;

  static void setToken(String token) {
    _token = token;
  }

  static Map<String, String> _getHeaders() {
    return {
      'Content-Type': 'application/json',
      if (_token != null) 'Authorization': 'Bearer $_token',
    };
  }

  // Auth endpoints
  static Future<Map<String, dynamic>> sendOtp(String phone) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/send-otp'),
        headers: _getHeaders(),
        body: jsonEncode({'phone': phone}),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception(jsonDecode(response.body)['error'] ?? 'Failed to send OTP');
      }
    } catch (e) {
      throw Exception('Error: $e');
    }
  }

  static Future<Map<String, dynamic>> verifyOtp(String phone, String code) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/verify-otp'),
        headers: _getHeaders(),
        body: jsonEncode({'phone': phone, 'code': code}),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception(jsonDecode(response.body)['error'] ?? 'Invalid OTP');
      }
    } catch (e) {
      throw Exception('Error: $e');
    }
  }

  static Future<User> getCurrentUser() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/auth/me'),
        headers: _getHeaders(),
      );

      if (response.statusCode == 200) {
        return User.fromJson(jsonDecode(response.body));
      } else {
        throw Exception('Failed to get user');
      }
    } catch (e) {
      throw Exception('Error: $e');
    }
  }

  // Listings endpoints
  static Future<Map<String, dynamic>> getListings({
    String? type,
    String? status,
    double? latitude,
    double? longitude,
    double? radius,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      String url = '$baseUrl/listings?page=$page&limit=$limit';
      if (type != null) {
        url += '&type=${Uri.encodeComponent(type)}';
      }
      if (status != null) {
        url += '&status=${Uri.encodeComponent(status)}';
      }
      if (latitude != null && longitude != null) {
        url += '&latitude=$latitude&longitude=$longitude';
      }
      if (radius != null) {
        url += '&radius=$radius';
      }

      final response = await http.get(
        Uri.parse(url),
        headers: _getHeaders(),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final listings = (data['data'] as List)
            .map((item) => Listing.fromJson(item))
            .toList();
        return {
          'listings': listings,
          'pagination': data['pagination'],
        };
      } else {
        throw Exception('Failed to load listings');
      }
    } catch (e) {
      throw Exception('Error: $e');
    }
  }

  static Future<Listing> getListingById(String id) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/listings/$id'),
        headers: _getHeaders(),
      );

      if (response.statusCode == 200) {
        return Listing.fromJson(jsonDecode(response.body)['data']);
      } else {
        throw Exception('Listing not found');
      }
    } catch (e) {
      throw Exception('Error: $e');
    }
  }

  static Future<Map<String, dynamic>> createListing({
    required String title,
    required String type,
    required double weight,
    required double price,
    required double latitude,
    required double longitude,
    required String address,
    String? description,
    String? city,
    List<String>? images,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/listings'),
        headers: _getHeaders(),
        body: jsonEncode({
          'title': title,
          'type': type,
          'weight': weight,
          'price': price,
          'latitude': latitude,
          'longitude': longitude,
          'address': address,
          'description': description,
          'city': city,
          'images': images,
        }),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to create listing');
      }
    } catch (e) {
      throw Exception('Error: $e');
    }
  }
}
