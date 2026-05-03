# Gallery Collections Feature Requirements

## Goal

Add a gallery system for Timpanogos Baseball that allows admins to create photo collections, upload and organize photos, and publish a front-end gallery experience inspired by Pixieset-style collection pages.

Reference style:
https://melaniehunterphotography.pixieset.com/uintahseries/

## Admin Experience

### Admin Navigation

- Add a link on the Admin page labeled `Collections`.
- The `Collections` link should open a separate admin collections page.
- This page should show all existing photo collections.
- This page should include a `New Collection` button.

### Collections Page

The admin collections page should display:

- A list or grid of all existing collections.
- Each collection should show:
  - Collection name
  - Event date
  - Cover/favorite photo if one exists
  - Number of photos
  - Basic actions such as edit, manage photos, or delete collection

### New Collection Modal

Clicking `New Collection` should open a modal titled `Create New Collection`.

The modal should include:

- `Collection Name` field
- `Event Date` field
- Create/Save button
- Cancel/Close button

After a collection is created, the admin should be able to upload photos into that collection.

### Photo Upload Modal

The admin should be able to upload photos to a collection through a modal or collection management screen.

Upload behavior:

- Allow browsing local files.
- Allow drag-and-drop uploads.
- Support multiple photo uploads at once.
- Upload photos into the selected collection.
- Show upload progress or loading state.
- Show errors for failed uploads.

### Collection Photo Management

Inside each collection, the admin should be able to manage uploaded photos.

Each photo should support:

- Reordering by drag and drop.
- Deleting the photo.
- Marking the photo as a favorite.

Favorite behavior:

- One photo can be marked as the favorite/cover photo for the collection.
- The favorite photo should be used as the main large image on the front-end collection page.
- If no favorite is selected, the first photo in the collection order can be used as the cover.

Ordering behavior:

- Photos should have a saved order.
- Drag-and-drop changes should persist.
- The front-end collection page should display photos in the saved order.

## Front-End Experience

### Gallery Page

Add a public gallery page to the site.

The gallery page should display all published collections.

Each collection card should show:

- Cover/favorite photo
- Collection name
- Event date
- Optional photo count

Clicking a collection should open that collection page.

### Collection Page

Each collection page should show:

- A large cover photo at the top.
- Collection name.
- Event date.
- A mosaic-style grid of the remaining photos below the cover photo.

The layout should feel similar to Pixieset:

- Clean, photo-forward design.
- Large hero/cover image.
- Masonry or mosaic photo layout.
- Minimal interface around the photos.
- Responsive layout for mobile and desktop.

### Photo Viewing

Optional but recommended:

- Clicking a photo opens a lightbox.
- Lightbox supports next/previous navigation.
- Lightbox can close with Escape or a close button.
- Mobile users can swipe between photos if feasible.

## Data Model

Suggested collection fields:

```js
{
  id: "collection-id",
  name: "Uintah Series",
  eventDate: "2026-04-08",
  createdAt: 1770000000000,
  updatedAt: 1770000000000,
  coverPhotoId: "photo-id",
  published: true
}
```

Suggested photo fields:

```js
{
  id: "photo-id",
  collectionId: "collection-id",
  url: "https://...",
  storagePath: "collections/collection-id/photo.jpg",
  fileName: "photo.jpg",
  order: 1,
  favorite: false,
  uploadedAt: 1770000000000
}
```

## Firebase Needs

This feature will likely need:

- Firebase Authentication for admin access.
- Firebase Realtime Database or Firestore for collection/photo metadata.
- Firebase Storage for uploaded image files.
- Security rules that allow:
  - Public read access for published collections/photos.
  - Admin-only write access for creating collections, uploading photos, sorting, deleting, and marking favorites.

## Security Requirements

- Only authenticated admins should be able to access collection management.
- Public visitors should not be able to upload, edit, reorder, or delete photos.
- Firebase write rules should not be public.
- Uploaded file types should be limited to images.
- Consider file size limits before upload.

## Nice-To-Have Enhancements

- Generate optimized image versions or thumbnails.
- Lazy-load gallery images.
- Add collection publish/unpublish toggle.
- Add collection descriptions.
- Add tags such as `Team`, `Game Day`, `Seniors`, `Playoffs`.
- Add bulk delete.
- Add cover photo cropping or focal point.
- Add image captions.
- Add download permissions later if needed.

## Open Decisions

- Use Firebase Realtime Database or Firestore for metadata?
- Use Firebase Storage directly from the browser or route uploads through a serverless function?
- Should collections be public immediately or require a `Publish` toggle?
- Should the Gallery page be added to the main nav?
- Should uploaded images be compressed client-side before upload?
- Should the current homepage carousel pull from favorite gallery photos later?
