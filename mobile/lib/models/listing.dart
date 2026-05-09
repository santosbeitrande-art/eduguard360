class Listing {
  final String id;
  final String title;
  final String? description;
  final String type;
  final double weight;
  final double price;
  final String status;
  final double latitude;
  final double longitude;
  final String address;
  final String? city;
  final List<String> images;
  final int viewCount;
  final UserPreview user;
  final DateTime createdAt;
  final DateTime? expiresAt;

  Listing({
    required this.id,
    required this.title,
    this.description,
    required this.type,
    required this.weight,
    required this.price,
    required this.status,
    required this.latitude,
    required this.longitude,
    required this.address,
    this.city,
    required this.images,
    this.viewCount = 0,
    required this.user,
    required this.createdAt,
    this.expiresAt,
  });

  factory Listing.fromJson(Map<String, dynamic> json) {
    return Listing(
      id: json['id'],
      title: json['title'],
      description: json['description'],
      type: json['type'],
      weight: (json['weight'] ?? 0).toDouble(),
      price: (json['price'] ?? 0).toDouble(),
      status: json['status'],
      latitude: (json['latitude'] ?? 0).toDouble(),
      longitude: (json['longitude'] ?? 0).toDouble(),
      address: json['address'],
      city: json['city'],
      images: List<String>.from(json['images'] ?? []),
      viewCount: json['viewCount'] ?? 0,
      user: UserPreview.fromJson(json['user']),
      createdAt: DateTime.parse(json['createdAt']),
      expiresAt: json['expiresAt'] != null ? DateTime.parse(json['expiresAt']) : null,
    );
  }
}

class UserPreview {
  final String id;
  final String name;
  final String? avatarUrl;
  final double rating;

  UserPreview({
    required this.id,
    required this.name,
    this.avatarUrl,
    required this.rating,
  });

  factory UserPreview.fromJson(Map<String, dynamic> json) {
    return UserPreview(
      id: json['id'],
      name: json['name'],
      avatarUrl: json['avatarUrl'],
      rating: (json['rating'] ?? 5.0).toDouble(),
    );
  }
}
