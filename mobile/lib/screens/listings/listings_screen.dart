import 'package:flutter/material.dart';
import '../../models/listing.dart';
import '../../services/api_service.dart';

class ListingsScreen extends StatefulWidget {
  const ListingsScreen({Key? key}) : super(key: key);

  @override
  State<ListingsScreen> createState() => _ListingsScreenState();
}

class _ListingsScreenState extends State<ListingsScreen> {
  late Future<Map<String, dynamic>> _listingsFuture;
  String? _selectedType;

  @override
  void initState() {
    super.initState();
    _fetchListings();
  }

  void _fetchListings() {
    setState(() {
      _listingsFuture = ApiService.getListings(
        type: _selectedType,
        status: 'available',
        page: 1,
        limit: 30,
      );
    });
  }

  Widget _buildFilterChip(String label, String? type) {
    return FilterChip(
      label: Text(label),
      selected: _selectedType == type,
      onSelected: (selected) {
        setState(() {
          _selectedType = selected ? type : null;
          _fetchListings();
        });
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: const [
                  Text(
                    'Anúncios',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Row(
                children: [
                  _buildFilterChip('Tudo', null),
                  const SizedBox(width: 8),
                  _buildFilterChip('Plástico', 'plastic'),
                  const SizedBox(width: 8),
                  _buildFilterChip('Metal', 'metal'),
                  const SizedBox(width: 8),
                  _buildFilterChip('Papel', 'paper'),
                  const SizedBox(width: 8),
                  _buildFilterChip('Vidro', 'glass'),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: FutureBuilder<Map<String, dynamic>>(
                future: _listingsFuture,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }

                  if (snapshot.hasError) {
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24.0),
                        child: Text('Erro ao carregar anúncios: ${snapshot.error}'),
                      ),
                    );
                  }

                  final listings = snapshot.data?['listings'] as List<Listing>? ?? [];

                  if (listings.isEmpty) {
                    return const Center(
                      child: Text('Nenhum anúncio disponível no momento.'),
                    );
                  }

                  return RefreshIndicator(
                    onRefresh: () async {
                      _fetchListings();
                      await _listingsFuture;
                    },
                    child: ListView.builder(
                      itemCount: listings.length,
                      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                      itemBuilder: (context, index) {
                        final listing = listings[index];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 12.0),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16.0),
                          ),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(16.0),
                            onTap: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Anúncio selecionado: ${listing.title}')),
                              );
                            },
                            child: Padding(
                              padding: const EdgeInsets.all(16.0),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(14.0),
                                    child: listing.images.isNotEmpty
                                        ? Image.network(
                                            listing.images[0],
                                            width: 90,
                                            height: 90,
                                            fit: BoxFit.cover,
                                            errorBuilder: (context, error, stackTrace) => Container(
                                              width: 90,
                                              height: 90,
                                              color: Colors.grey[200],
                                              child: const Icon(Icons.image_not_supported),
                                            ),
                                          )
                                        : Container(
                                            width: 90,
                                            height: 90,
                                            color: Colors.grey[200],
                                            child: const Icon(Icons.image, size: 30),
                                          ),
                                  ),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          listing.title,
                                          style: const TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        const SizedBox(height: 6),
                                        Text(
                                          listing.address,
                                          style: const TextStyle(fontSize: 13, color: Colors.grey),
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 12),
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text('€${listing.price.toStringAsFixed(2)}'),
                                            Text('${listing.weight.toStringAsFixed(1)} kg'),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
