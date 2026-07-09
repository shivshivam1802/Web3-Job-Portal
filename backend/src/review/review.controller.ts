import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ReviewService } from './review.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async submitReview(
    @CurrentUser() user: any,
    @Body('contractId') contractId: string,
    @Body('ratingOverall') ratingOverall: number,
    @Body('ratingCommunication') ratingCommunication: number,
    @Body('ratingSkill') ratingSkill: number,
    @Body('ratingTimeliness') ratingTimeliness: number,
    @Body('comment') comment: string,
  ) {
    return this.reviewService.submitReview(user.id, {
      contractId,
      ratingOverall,
      ratingCommunication,
      ratingSkill,
      ratingTimeliness,
      comment,
    });
  }

  @Get('user/:userId/average')
  async getAverage(@Param('userId') userId: string) {
    return this.reviewService.getAverageRating(userId);
  }

  @Get('user/:userId/received')
  async getReceived(@Param('userId') userId: string) {
    return this.reviewService.getUserReviews(userId, 'received');
  }

  @Get('user/:userId/written')
  async getWritten(@Param('userId') userId: string) {
    return this.reviewService.getUserReviews(userId, 'written');
  }
}
