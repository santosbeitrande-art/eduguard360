import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../models/listing.dart';
import '../services/api_service.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({Key? key}) : super(key: key);

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final Completer<GoogleMapController> _controller = Completer();
  final Set<Marker> _markers = {};
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadListings();
  }

  Future<void> _loadListings() async {
    try {
      final listings = await ApiService.getListings();
      setState(() {
        _markers.clear();
        _markers.addAll(listings.map((listing) {
          return Marker(
            markerId: MarkerId(listing.id),
            position: LatLng(listing.latitude, listing.longitude),
            infoWindow: InfoWindow(
              title: listing.title,
              snippet: '€${listing.price.toStringAsFixed(2)} • ${listing.type}',
            ),
          );
        }));
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(child: Text('Erro: $_error'));
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Mapa de Coleta')),
      body: GoogleMap(
        initialCameraPosition: const CameraPosition(
          target: LatLng(38.72, -9.14),
          zoom: 12,
        ),
        markers: _markers,
        onMapCreated: (GoogleMapController controller) {
          _controller.complete(controller);
        },
      ),
    );
  }
}
