class User {
  final String id;
  final String phone;

  User({required this.id, required this.phone});

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      phone: json['phone'],
    );
  }
}
