interface Place {
    lat?: number | null;
    lng?: number | null;
    streetAddress?: string | null;
    town?: string | null;
    district?: string | null;
    pincode?: string | null;
}

// Exact coordinates when the customer shared them, otherwise a search for the typed address.
export function mapsLinkFor(place: Place): string | null {
    if (place.lat != null && place.lng != null) {
        return `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
    }
    if (place.streetAddress) {
        const query = [place.streetAddress, place.town, place.district, place.pincode].filter(Boolean).join(", ");
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    }
    return null;
}
