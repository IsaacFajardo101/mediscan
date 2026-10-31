// Matches the item structure in Fetch Profile.json & Add Profile.json
export interface Profile {
  profile_id: number;
  profile_icon: number; // Integer (1 to 12)
  profile_fullname: string;
  profile_birthdate: string;
  profile_display_name: string; // nickname shown everywhere, e.g. "Me", "Mama", "Jan"
}

// Request Payload: Downloads/Mockdata/Profiles/Request/Add Profile.json
export interface AddProfileRequest {
  profile_icon: number;
  profile_fullname: string;
  profile_birthdate: string;
  profile_display_name: string;
}

// Request Payload: Downloads/Mockdata/Profiles/Request/Edit Profile.json
export interface EditProfileRequest {
  profile_icon?: number;
  profile_fullname?: string;
  profile_birthdate?: string;
  profile_display_name?: string;
}

// Response: Downloads/Mockdata/Profiles/Response/Fetch Profile.json
export interface FetchProfileResponse {
  success: boolean;
  code: number;
  message: string;
  data: {
    account_id: number;
    email: string;
    profiles: Profile[];
  };
}

// Response: Add / Edit / Delete responses
export interface ApiResponse<T = any> {
  success: boolean;
  code: number;
  message: string;
  data?: T;
}