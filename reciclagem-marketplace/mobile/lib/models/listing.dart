class Listing {
  final String id;
  final String title;
  final String type;
  final double weight;
  final double price;
  final String address;
  final double latitude;
  final double longitude;

  Listing({
    required this.id,
    required this.title,
    required this.type,
    required this.weight,
    required this.price,
    required this.address,
    required this.latitude,
    required this.longitude,
  });

  factory Listing.fromJson(Map<String, dynamic> json) {
    return Listing(
      id: json['id'],
      title: json['title'],
      type: json['type'],
      weight: (json['weight'] ?? 0).toDouble(),
      price: (json['price'] ?? 0).toDouble(),
      address: json['address'],
      latitude: (json['latitude'] ?? 0).toDouble(),
      longitude: (json['longitude'] ?? 0).toDouble(),
    );
  }
}
