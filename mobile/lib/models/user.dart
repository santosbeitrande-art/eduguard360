class User {
  final String id;
  final String phone;
  final String name;
  final String? email;
  final String? avatarUrl;
  final double rating;
  final int totalReviews;
  final String role;
  final DateTime createdAt;

  User({
    required this.id,
    required this.phone,
    required this.name,
    this.email,
    this.avatarUrl,
    this.rating = 5.0,
    this.totalReviews = 0,
    this.role = 'both',
    required this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      phone: json['phone'],
      name: json['name'],
      email: json['email'],
      avatarUrl: json['avatarUrl'],
      rating: (json['rating'] ?? 5.0).toDouble(),
      totalReviews: json['totalReviews'] ?? 0,
      role: json['role'] ?? 'both',
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}
