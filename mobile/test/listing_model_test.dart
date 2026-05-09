import 'package:flutter_test/flutter_test.dart';
import 'package:ecotrade360/models/listing.dart';

void main() {
  test('Listing.fromJson parses values correctly', () {
    final json = {
      'id': 'abc123',
      'title': 'Plástico reciclável',
      'description': 'Uma carga de plástico reutilizável',
      'type': 'plastic',
      'weight': 8.5,
      'price': 15.25,
      'status': 'available',
      'latitude': 38.7169,
      'longitude': -9.1399,
      'address': 'Avenida da Liberdade, Lisboa',
      'city': 'Lisboa',
      'images': ['https://example.com/image1.png'],
      'viewCount': 12,
      'user': {
        'id': 'user-1',
        'name': 'Nuno',
        'avatarUrl': null,
        'rating': 4.8,
      },
      'createdAt': '2026-05-01T12:00:00.000Z',
      'expiresAt': '2026-06-01T12:00:00.000Z',
    };

    final listing = Listing.fromJson(json);

    expect(listing.id, 'abc123');
    expect(listing.title, 'Plástico reciclável');
    expect(listing.type, 'plastic');
    expect(listing.price, 15.25);
    expect(listing.latitude, 38.7169);
    expect(listing.longitude, -9.1399);
    expect(listing.address, 'Avenida da Liberdade, Lisboa');
    expect(listing.images.length, 1);
    expect(listing.user.name, 'Nuno');
    expect(listing.createdAt.year, 2026);
    expect(listing.expiresAt?.month, 6);
  });
}
