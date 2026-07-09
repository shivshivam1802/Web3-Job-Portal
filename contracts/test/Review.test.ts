import { expect } from "chai";
import { ethers } from "hardhat";
import { Review } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Review", function () {
  let review: Review;
  
  let owner: SignerWithAddress;
  let client: SignerWithAddress;
  let freelancer: SignerWithAddress;
  let otherAccount: SignerWithAddress;

  const JOB_ID_1 = ethers.keccak256(ethers.toUtf8Bytes("job1"));
  const JOB_ID_2 = ethers.keccak256(ethers.toUtf8Bytes("job2"));

  beforeEach(async function () {
    [owner, client, freelancer, otherAccount] = await ethers.getSigners();

    // Deploy Review
    const ReviewFactory = await ethers.getContractFactory("Review");
    review = await ReviewFactory.deploy(owner.address) as Review;

    // Set authorized caller
    await review.connect(owner).setAuthorizedCaller(owner.address, true);
  });

  describe("Deployment", function () {
    it("Should set correct owner", async function () {
      expect(await review.owner()).to.equal(owner.address);
    });
  });

  describe("Caller Authorization", function () {
    it("Should configure authorized caller", async function () {
      expect(await review.authorizedCallers(owner.address)).to.be.true;
    });

    it("Should revoke caller authorization", async function () {
      await review.connect(owner).setAuthorizedCaller(owner.address, false);
      expect(await review.authorizedCallers(owner.address)).to.be.false;
    });
  });

  describe("Submit Review", function () {
    it("Should allow authorized caller to submit a valid review", async function () {
      const comment = "Excellent work done on time!";
      await expect(review.connect(owner).submitReview(JOB_ID_1, client.address, freelancer.address, 5, 5, 5, 5, comment))
        .to.emit(review, "ReviewSubmitted")
        .withArgs(JOB_ID_1, client.address, freelancer.address, 5, comment);

      const rDetails = await review.reviews(JOB_ID_1, client.address);
      expect(rDetails.reviewer).to.equal(client.address);
      expect(rDetails.reviewee).to.equal(freelancer.address);
      expect(rDetails.overallRating).to.equal(5);
      expect(rDetails.comment).to.equal(comment);

      // Check stats
      const stats = await review.userStats(freelancer.address);
      expect(stats.totalRatingScore).to.equal(5);
      expect(stats.reviewCount).to.equal(1);
    });

    it("Should revert if rating is out of range", async function () {
      await expect(
        review.connect(owner).submitReview(JOB_ID_1, client.address, freelancer.address, 6, 5, 5, 5, "Good")
      ).to.be.revertedWith("Review: Ratings must be between 1 and 5");

      await expect(
        review.connect(owner).submitReview(JOB_ID_1, client.address, freelancer.address, 5, 0, 5, 5, "Good")
      ).to.be.revertedWith("Review: Ratings must be between 1 and 5");
    });

    it("Should prevent duplicate reviews from the same reviewer for the same job", async function () {
      await review.connect(owner).submitReview(JOB_ID_1, client.address, freelancer.address, 4, 4, 4, 4, "Good");

      await expect(
        review.connect(owner).submitReview(JOB_ID_1, client.address, freelancer.address, 5, 5, 5, 5, "Better")
      ).to.be.revertedWith("Review: Already reviewed for this job");
    });
  });

  describe("Running Averages Calculation", function () {
    it("Should calculate averages accurately with 100x scaling precision", async function () {
      // First review: 5 stars
      await review.connect(owner).submitReview(JOB_ID_1, client.address, freelancer.address, 5, 5, 5, 5, "Excellent");
      let [avg, count] = await review.getAverageRating(freelancer.address);
      expect(avg).to.equal(500); // 5.0 * 100
      expect(count).to.equal(1);

      // Second review: 4 stars
      await review.connect(owner).submitReview(JOB_ID_2, otherAccount.address, freelancer.address, 4, 4, 4, 4, "Good");
      [avg, count] = await review.getAverageRating(freelancer.address);
      expect(avg).to.equal(450); // (5 + 4)/2 = 4.5 * 100 = 450
      expect(count).to.equal(2);
    });

    it("Should return zero if user has no reviews", async function () {
      const [avg, count] = await review.getAverageRating(otherAccount.address);
      expect(avg).to.equal(0);
      expect(count).to.equal(0);
    });
  });
});
