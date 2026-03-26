import requests
import sys
import json
from datetime import datetime, timedelta

class ShippingAPITester:
    def __init__(self, base_url="https://global-access-ship.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.customer_token = None
        self.driver_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_shipment_id = None
        self.created_tracking_number = None

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.content else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Response: {response.text}")

            return success, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test API health endpoints"""
        print("\n=== HEALTH CHECK TESTS ===")
        self.run_test("API Root", "GET", "", 200)
        self.run_test("Health Check", "GET", "health", 200)

    def test_admin_login(self):
        """Test admin login"""
        print("\n=== ADMIN LOGIN TEST ===")
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@globalaccess.com", "password": "admin123"}
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"✅ Admin token obtained")
            return True
        return False

    def test_user_registration(self):
        """Test user registration for customer and driver"""
        print("\n=== USER REGISTRATION TESTS ===")
        
        # Register customer
        timestamp = datetime.now().strftime('%H%M%S')
        customer_email = f"customer_{timestamp}@test.com"
        success, response = self.run_test(
            "Customer Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": customer_email,
                "password": "testpass123",
                "name": f"Test Customer {timestamp}",
                "role": "customer",
                "phone": "+1234567890"
            }
        )
        if success and 'access_token' in response:
            self.customer_token = response['access_token']
            print(f"✅ Customer token obtained")

        # Register driver
        driver_email = f"driver_{timestamp}@test.com"
        success, response = self.run_test(
            "Driver Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": driver_email,
                "password": "testpass123",
                "name": f"Test Driver {timestamp}",
                "role": "driver",
                "phone": "+1234567891"
            }
        )
        if success and 'access_token' in response:
            self.driver_token = response['access_token']
            print(f"✅ Driver token obtained")

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n=== AUTHENTICATION TESTS ===")
        
        # Test /auth/me endpoint
        if self.admin_token:
            self.run_test("Get Admin Profile", "GET", "auth/me", 200, token=self.admin_token)
        
        if self.customer_token:
            self.run_test("Get Customer Profile", "GET", "auth/me", 200, token=self.customer_token)

    def test_user_management(self):
        """Test user management endpoints (admin only)"""
        print("\n=== USER MANAGEMENT TESTS ===")
        
        if not self.admin_token:
            print("❌ No admin token available for user management tests")
            return

        # Get all users
        self.run_test("Get All Users", "GET", "users", 200, token=self.admin_token)
        
        # Get drivers
        self.run_test("Get Drivers", "GET", "users/drivers", 200, token=self.admin_token)

    def test_shipment_creation(self):
        """Test shipment creation"""
        print("\n=== SHIPMENT CREATION TESTS ===")
        
        if not self.admin_token:
            print("❌ No admin token available for shipment creation")
            return

        # Create shipment
        shipment_data = {
            "sender_name": "Test Sender",
            "sender_email": "sender@test.com",
            "sender_phone": "+1234567890",
            "sender_address": "123 Sender St, Test City, TC 12345",
            "recipient_name": "Test Recipient",
            "recipient_email": "recipient@test.com",
            "recipient_phone": "+1234567891",
            "recipient_address": "456 Recipient Ave, Test City, TC 12346",
            "package_description": "Test package for API testing",
            "weight": 2.5,
            "dimensions": "30x20x10 cm",
            "estimated_delivery": (datetime.now() + timedelta(days=3)).isoformat()
        }

        success, response = self.run_test(
            "Create Shipment",
            "POST",
            "shipments",
            200,
            data=shipment_data,
            token=self.admin_token
        )
        
        if success and 'id' in response:
            self.created_shipment_id = response['id']
            self.created_tracking_number = response['tracking_number']
            print(f"✅ Shipment created with ID: {self.created_shipment_id}")
            print(f"✅ Tracking number: {self.created_tracking_number}")

    def test_shipment_operations(self):
        """Test shipment CRUD operations"""
        print("\n=== SHIPMENT OPERATIONS TESTS ===")
        
        if not self.admin_token or not self.created_shipment_id:
            print("❌ No admin token or shipment ID available")
            return

        # Get all shipments
        self.run_test("Get All Shipments", "GET", "shipments", 200, token=self.admin_token)
        
        # Get specific shipment
        self.run_test(
            "Get Specific Shipment", 
            "GET", 
            f"shipments/{self.created_shipment_id}", 
            200, 
            token=self.admin_token
        )
        
        # Update shipment
        update_data = {
            "package_description": "Updated test package description",
            "weight": 3.0
        }
        self.run_test(
            "Update Shipment",
            "PUT",
            f"shipments/{self.created_shipment_id}",
            200,
            data=update_data,
            token=self.admin_token
        )

    def test_tracking_operations(self):
        """Test tracking operations"""
        print("\n=== TRACKING OPERATIONS TESTS ===")
        
        if not self.admin_token or not self.created_shipment_id:
            print("❌ No admin token or shipment ID available")
            return

        # Add tracking event
        tracking_data = {
            "status": "picked_up",
            "location": "Distribution Center",
            "notes": "Package picked up for delivery"
        }
        
        self.run_test(
            "Add Tracking Event",
            "POST",
            f"shipments/{self.created_shipment_id}/tracking",
            200,
            data=tracking_data,
            token=self.admin_token
        )

        # Test public tracking (no auth required)
        if self.created_tracking_number:
            self.run_test(
                "Public Tracking",
                "GET",
                f"track/{self.created_tracking_number}",
                200
            )

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        print("\n=== DASHBOARD STATS TESTS ===")
        
        if self.admin_token:
            self.run_test("Admin Dashboard Stats", "GET", "dashboard/stats", 200, token=self.admin_token)
        
        if self.customer_token:
            self.run_test("Customer Dashboard Stats", "GET", "dashboard/stats", 200, token=self.customer_token)

    def test_role_based_access(self):
        """Test role-based access control"""
        print("\n=== ROLE-BASED ACCESS TESTS ===")
        
        # Test customer trying to access admin endpoints
        if self.customer_token:
            self.run_test(
                "Customer Access to Users (Should Fail)",
                "GET",
                "users",
                403,
                token=self.customer_token
            )

        # Test driver access to their deliveries
        if self.driver_token:
            self.run_test("Driver Dashboard Stats", "GET", "dashboard/stats", 200, token=self.driver_token)

    def test_error_cases(self):
        """Test error handling"""
        print("\n=== ERROR HANDLING TESTS ===")
        
        # Test invalid login
        self.run_test(
            "Invalid Login",
            "POST",
            "auth/login",
            401,
            data={"email": "invalid@test.com", "password": "wrongpass"}
        )
        
        # Test accessing protected endpoint without token
        self.run_test("No Auth Token", "GET", "shipments", 403)
        
        # Test non-existent shipment
        if self.admin_token:
            self.run_test(
                "Non-existent Shipment",
                "GET",
                "shipments/non-existent-id",
                404,
                token=self.admin_token
            )

def main():
    print("🚀 Starting Global Access Shipping API Tests")
    print("=" * 50)
    
    tester = ShippingAPITester()
    
    # Run all tests
    tester.test_health_check()
    
    if not tester.test_admin_login():
        print("❌ Admin login failed, stopping critical tests")
        return 1
    
    tester.test_user_registration()
    tester.test_auth_endpoints()
    tester.test_user_management()
    tester.test_shipment_creation()
    tester.test_shipment_operations()
    tester.test_tracking_operations()
    tester.test_dashboard_stats()
    tester.test_role_based_access()
    tester.test_error_cases()
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Tests completed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"📈 Success rate: {success_rate:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())