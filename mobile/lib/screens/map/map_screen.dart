import 'dart:async';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../models/listing.dart';
import '../../services/api_service.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({Key? key}) : super(key: key);

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final Completer<GoogleMapController> _mapController = Completer();
  CameraPosition _initialCameraPosition = const CameraPosition(
    target: LatLng(38.736946, -9.142685),
    zoom: 12,
  );
  Set<Marker> _markers = {};
  bool _isLoading = true;
  String? _error;
  Position? _currentPosition;
  List<Listing> _listings = [];

  @override
  void initState() {
    super.initState();
    _initializeMap();
  }

  Future<void> _initializeMap() async {
    try {
      final hasPermission = await _requestLocationPermission();
      if (hasPermission) {
        _currentPosition = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
        );
        _initialCameraPosition = CameraPosition(
          target: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
          zoom: 13,
        );
        await _moveCamera(_initialCameraPosition.target);
      }
      await _loadListings();
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<bool> _requestLocationPermission() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      setState(() {
        _error = 'Ative o serviço de localização para ver anúncios no mapa.';
      });
      return false;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
      setState(() {
        _error = 'Permissão de localização negada. O mapa exibirá anúncios por região padrão.';
      });
      return false;
    }

    return true;
  }

  Future<void> _loadListings() async {
    try {
      final result = await ApiService.getListings(
        latitude: _currentPosition?.latitude,
        longitude: _currentPosition?.longitude,
        radius: 20,
        status: 'available',
        page: 1,
        limit: 50,
      );

      final listings = result['listings'] as List<Listing>;
      setState(() {
        _listings = listings;
        _markers = listings.map(_toMarker).toSet();
      });
    } catch (e) {
      setState(() {
        _error = 'Não foi possível carregar os anúncios do mapa: $e';
      });
    }
  }

  Marker _toMarker(Listing listing) {
    return Marker(
      markerId: MarkerId(listing.id),
      position: LatLng(listing.latitude, listing.longitude),
      infoWindow: InfoWindow(
        title: listing.title,
        snippet: '€${listing.price.toStringAsFixed(2)} • ${listing.type}',
      ),
      icon: BitmapDescriptor.defaultMarkerWithHue(
        listing.status == 'available' ? BitmapDescriptor.hueGreen : BitmapDescriptor.hueOrange,
      ),
    );
  }

  Future<void> _moveCamera(LatLng target) async {
    final controller = await _mapController.future;
    controller.animateCamera(CameraUpdate.newLatLngZoom(target, 13));
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Text(
            _error!,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.redAccent),
          ),
        ),
      );
    }

    return Stack(
      children: [
        GoogleMap(
          initialCameraPosition: _initialCameraPosition,
          markers: _markers,
          compassEnabled: true,
          myLocationEnabled: _currentPosition != null,
          myLocationButtonEnabled: true,
          onMapCreated: (controller) {
            if (!_mapController.isCompleted) {
              _mapController.complete(controller);
            }
          },
        ),
        Positioned(
          bottom: 18,
          left: 16,
          right: 16,
          child: Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            elevation: 6,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      '${_listings.length} anúncios disponíveis próximo a você',
                      style: const TextStyle(fontSize: 14),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.refresh, color: Colors.green),
                    onPressed: () async {
                      setState(() => _isLoading = true);
                      await _loadListings();
                      setState(() => _isLoading = false);
                    },
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
